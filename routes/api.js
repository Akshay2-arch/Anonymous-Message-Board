'use strict';

// Collection name pattern: board name used directly (sanitized to string)

module.exports = function (app, db, ObjectId) {
  // Helper to get collection for board
  function col(board){
    return db.collection(board);
  }

  // THREADS
  app.route('/api/threads/:board')
    .post(async (req,res)=>{
      try {
        const board = req.params.board;
        const { text, delete_password } = req.body;
        if(!text || !delete_password) return res.status(400).send('missing fields');
        const now = new Date();
        const doc = { text, delete_password, created_on: now, bumped_on: now, reported: false, replies: [] };
        const result = await col(board).insertOne(doc);
        return res.json({
          _id: result.insertedId,
          text: doc.text,
          created_on: doc.created_on,
          bumped_on: doc.bumped_on,
          reported: doc.reported,
          delete_password: doc.delete_password,
          replies: doc.replies
        });
      } catch(err){ res.status(500).send('server error'); }
    })
    .get(async (req,res)=>{
      try {
        const board = req.params.board;
        const threads = await col(board).find({}, { projection: { delete_password: 0, reported: 0 }})
          .sort({ bumped_on: -1 })
          .limit(10)
          .toArray();
        const cleansed = threads.map(t=>({
          _id: t._id,
          text: t.text,
          created_on: t.created_on,
          bumped_on: t.bumped_on,
          replycount: (t.replies||[]).length,
          replies: (t.replies||[])
            .slice(-3) // last 3
            .map(r=>({ _id: r._id, text: r.text, created_on: r.created_on }))
        }));
        return res.json(cleansed);
      } catch(err){ res.status(500).send('server error'); }
    })
    .delete(async (req,res)=>{
      try {
        const board = req.params.board;
        const { thread_id, delete_password } = req.body;
        if(!thread_id || !delete_password) return res.status(400).send('missing fields');
        const thread = await col(board).findOne({ _id: new ObjectId(thread_id) });
        if(!thread) return res.status(200).send('incorrect password'); // spec ambiguous; treat missing as incorrect
        if(thread.delete_password !== delete_password) return res.send('incorrect password');
        await col(board).deleteOne({ _id: thread._id });
        return res.send('success');
      } catch(err){ res.status(500).send('server error'); }
    })
    .put(async (req,res)=>{
      try {
        const board = req.params.board;
        const { thread_id } = req.body;
        if(!thread_id) return res.status(400).send('missing thread_id');
        await col(board).updateOne({ _id: new ObjectId(thread_id) }, { $set: { reported: true }});
        return res.send('reported');
      } catch(err){ res.status(500).send('server error'); }
    });

  // REPLIES
  app.route('/api/replies/:board')
    .post(async (req,res)=>{
      try {
        const board = req.params.board;
        const { thread_id, text, delete_password } = req.body;
        if(!thread_id || !text || !delete_password) return res.status(400).send('missing fields');
        const now = new Date();
        const reply = { _id: new ObjectId(), text, delete_password, created_on: now, reported: false };
        const update = await col(board).findOneAndUpdate(
          { _id: new ObjectId(thread_id) },
          { $push: { replies: reply }, $set: { bumped_on: now } },
          { returnDocument: 'after' }
        );
        if(!update.value) return res.status(404).send('thread not found');
        return res.json({
          _id: update.value._id,
          text: update.value.text,
          created_on: update.value.created_on,
          bumped_on: update.value.bumped_on,
          reported: update.value.reported,
          delete_password: update.value.delete_password,
          replies: update.value.replies.map(r=>({
            _id: r._id,
            text: r.text,
            created_on: r.created_on,
            delete_password: r.delete_password,
            reported: r.reported
          }))
        });
      } catch(err){ res.status(500).send('server error'); }
    })
    .get(async (req,res)=>{
      try {
        const board = req.params.board;
        const { thread_id } = req.query;
        if(!thread_id) return res.status(400).send('missing thread_id');
        const thread = await col(board).findOne({ _id: new ObjectId(thread_id) });
        if(!thread) return res.status(404).send('not found');
        return res.json({
          _id: thread._id,
          text: thread.text,
          created_on: thread.created_on,
          bumped_on: thread.bumped_on,
          replies: (thread.replies||[]).map(r=>({ _id: r._id, text: r.text, created_on: r.created_on }))
        });
      } catch(err){ res.status(500).send('server error'); }
    })
    .delete(async (req,res)=>{
      try {
        const board = req.params.board;
        const { thread_id, reply_id, delete_password } = req.body;
        if(!thread_id || !reply_id || !delete_password) return res.status(400).send('missing fields');
        const thread = await col(board).findOne({ _id: new ObjectId(thread_id) });
        if(!thread) return res.status(200).send('incorrect password');
        const reply = (thread.replies||[]).find(r=> r._id.equals ? r._id.equals(reply_id) : r._id.toString() === reply_id);
        if(!reply || reply.delete_password !== delete_password) return res.send('incorrect password');
        await col(board).updateOne({ _id: thread._id, 'replies._id': reply._id }, { $set: { 'replies.$.text': '[deleted]' } });
        return res.send('success');
      } catch(err){ res.status(500).send('server error'); }
    })
    .put(async (req,res)=>{
      try {
        const board = req.params.board;
        const { thread_id, reply_id } = req.body;
        if(!thread_id || !reply_id) return res.status(400).send('missing fields');
        await col(board).updateOne({ _id: new ObjectId(thread_id), 'replies._id': new ObjectId(reply_id) }, { $set: { 'replies.$.reported': true }});
        return res.send('reported');
      } catch(err){ res.status(500).send('server error'); }
    });
};
