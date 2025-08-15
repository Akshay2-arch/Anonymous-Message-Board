const chai = require('chai');
const chaiHttp = require('chai-http');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
	this.timeout(5000);
	const board = 'test';
	let threadId;
	let replyId;
	const threadPassword = 'pass123';
	const replyPassword = 'replypass';

	test('Creating a new thread: POST /api/threads/:board', function(done){
		chai.request(server)
			.post('/api/threads/'+board)
			.send({ text: 'Test thread', delete_password: threadPassword })
			.end((err,res)=>{
				assert.equal(res.status,200);
				assert.exists(res.body._id);
				threadId = res.body._id;
				done();
			});
	});

	test('Viewing the 10 most recent threads: GET /api/threads/:board', function(done){
		chai.request(server)
			.get('/api/threads/'+board)
			.end((err,res)=>{
				assert.equal(res.status,200);
				assert.isArray(res.body);
				if(res.body.length){
					assert.notProperty(res.body[0],'delete_password');
					assert.notProperty(res.body[0],'reported');
				}
				done();
			});
	});

	test('Reporting a thread: PUT /api/threads/:board', function(done){
		chai.request(server)
			.put('/api/threads/'+board)
			.send({ thread_id: threadId })
			.end((err,res)=>{
				assert.equal(res.status,200);
				assert.equal(res.text,'reported');
				done();
			});
	});

	test('Creating a new reply: POST /api/replies/:board', function(done){
		chai.request(server)
			.post('/api/replies/'+board)
			.send({ thread_id: threadId, text: 'Test reply', delete_password: replyPassword })
			.end((err,res)=>{
				assert.equal(res.status,200);
				const last = res.body.replies.slice(-1)[0];
				replyId = last._id;
				done();
			});
	});

	test('Viewing a single thread: GET /api/replies/:board', function(done){
		chai.request(server)
			.get('/api/replies/'+board)
			.query({ thread_id: threadId })
			.end((err,res)=>{
				assert.equal(res.status,200);
				assert.equal(res.body._id, threadId);
				done();
			});
	});

	test('Reporting a reply: PUT /api/replies/:board', function(done){
		chai.request(server)
			.put('/api/replies/'+board)
			.send({ thread_id: threadId, reply_id: replyId })
			.end((err,res)=>{
				assert.equal(res.status,200);
				assert.equal(res.text,'reported');
				done();
			});
	});

	test('Deleting a reply with incorrect password: DELETE /api/replies/:board', function(done){
		chai.request(server)
			.delete('/api/replies/'+board)
			.send({ thread_id: threadId, reply_id: replyId, delete_password: 'wrong' })
			.end((err,res)=>{
				assert.equal(res.status,200);
				assert.equal(res.text,'incorrect password');
				done();
			});
	});

	test('Deleting a reply with correct password: DELETE /api/replies/:board', function(done){
		chai.request(server)
			.delete('/api/replies/'+board)
			.send({ thread_id: threadId, reply_id: replyId, delete_password: replyPassword })
			.end((err,res)=>{
				assert.equal(res.status,200);
				assert.equal(res.text,'success');
				done();
			});
	});

	test('Deleting a thread with incorrect password: DELETE /api/threads/:board', function(done){
		chai.request(server)
			.delete('/api/threads/'+board)
			.send({ thread_id: threadId, delete_password: 'wrong' })
			.end((err,res)=>{
				assert.equal(res.status,200);
				assert.equal(res.text,'incorrect password');
				done();
			});
	});

	test('Deleting a thread with correct password: DELETE /api/threads/:board', function(done){
		chai.request(server)
			.delete('/api/threads/'+board)
			.send({ thread_id: threadId, delete_password: threadPassword })
			.end((err,res)=>{
				assert.equal(res.status,200);
				assert.equal(res.text,'success');
				done();
			});
	});
});
