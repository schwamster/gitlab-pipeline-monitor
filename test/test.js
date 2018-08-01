var assert = require('assert');
var monitor = require('./../gitlab-pipeline-monitor');
const zlib = require('zlib');

//Important - if you want to run this test suite you have to have a valid Gitlab Access Token in an env called GITLABACCESSTOKEN
describe('List Projects', function () {
    this.timeout(50000);
    describe('for existing namespace for a group', function () {
        it('should return 1+ projects', function (done) {
            let event = {
                config: {
                    token: process.env.GITLABACCESSTOKEN,
                    namespace: 'groups/9b193a18-33e9-497a-89db-60a920267cbf',
                    baseUrl: 'https://gitlab.com/api/v4',
                    branch: 'master'
                }
            };

            monitor.main(event, null, (x, response) => {
                try {
                    assert.ok(response.projects.length > 0);
                    console.log(`\t(info): found ${response.projects.length} projects`);
                    done();
                }
                catch (error) {
                    done(error);
                }
            });
        });
    });

    describe('for existing namespace for a user', function () {
        it('should return 1+ projects', function (done) {
            let event = {
                config: {
                    token: process.env.GITLABACCESSTOKEN,
                    namespace: 'users/schwamster',
                    baseUrl: 'https://gitlab.com/api/v4',
                    branch: 'master'
                }
            };
            monitor.main(event, null, (x, response) => {
                try {
                    assert.ok(response.projects.length > 0);
                    assert.notEqual(response.projects[0].status, 'unknown');
                    console.log(`\t(info): found ${response.projects.length} projects`);
                    done();
                }
                catch (error) {
                    done(error);
                }
            });
        });
    });

    describe('for existing namespace for a user, but invalid token', function () {
        it('should return error', function (done) {
            let event = {
                config: {
                    token: 'basdf',
                    namespace: 'users/schwamster',
                    baseUrl: 'https://gitlab.com/api/v4',
                    branch: 'master'
                }
            };

            monitor.main(event, null, (x, response) => {
                try {
                    assert.ok(response.error);
                    done();
                }
                catch (error) {
                    done(error);
                }
            });
        });
    });


});

describe('Extract Message', function () {
    describe('generated queue log', function () {
        it('should return cleartext message', function () {
            let messageContent = 'H4sIAAAAAAAAA91Qu27DMBDb+xWG5sjWw3Esbx2zFx26yfI5USNLhiS7Q5B/77lFiowdOhW44cAjCR6vRM8z6cjJZqd7OtsZnPVAp+BtDpHsCPgV78/O4Z7tBCnraVMIxlvKcPgLl10tulqVtZRvSHOwgkPK0Y8hTjrb4BFdIaZt6wgvWckQMSFGcF/344C4acQooDVU7RWjnENLWy5GyobhULfDXikuN/twer17iR1JEFdrAPVzDO9gskAOpsxLQiwtxkBKCGH0pE8bz5zBXGAo7t8WYSwetEvcwp9znlNXVd/NlCZMleq5khrflhIUrdVB01YNPW2YVoKJ5mD6sfoxuj1d/2G5/LHcxV98+PC/LZf/Vbmc3D4By7ednLkCAAA=';
            let expected = '{"app":"gitlab-pipeline-monitor","env":"All","timestamp":"2018-08-01T13:42:49.433Z","level":"Information","version":"1.0.0","correlationId":"c62f2e8c-9590-11e8-812f-0dd748d59913","logVersion":2,"service":"project2","status":"success","message":"checked pipeline of project2","url":"https://gitlab.com/9b193a18-33e9-497a-89db-60a920267cbf/project2"}\n{"app":"gitlab-pipeline-monitor","env":"All","timestamp":"2018-08-01T13:42:49.433Z","level":"Information","version":"1.0.0","correlationId":"c62f2e8c-9590-11e8-812f-0dd748d59913","logVersion":2,"service":"project1","status":"unknown","message":"checked pipeline of project1","url":"https://gitlab.com/9b193a18-33e9-497a-89db-60a920267cbf/project1"}';
            const buffer = Buffer.from(messageContent, 'base64');
            let result = zlib.gunzipSync(buffer).toString('utf8');

            assert.equal(result, expected);            
        });
    });

});