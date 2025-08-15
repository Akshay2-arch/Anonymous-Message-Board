const chai = require('chai');
const chaiHttp = require('chai-http');
console.log('chaiHttp:', typeof chaiHttp);
chai.use(chaiHttp);