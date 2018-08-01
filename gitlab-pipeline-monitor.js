'use strict';
const axios = require('axios');
const AWS = require('aws-sdk');
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
const zlib = require('zlib');

module.exports.main = (event, context, callback) => {

  let config = null;
  if (event && event.config) {
    config = event.config;
  }

  if (config == null) {
    let ssm = new AWS.SSM();
    let ssmParams = {
      Names: [
        '/gitlab-pipeline-monitor/token',
        '/gitlab-pipeline-monitor/baseUrl',
        '/gitlab-pipeline-monitor/namespace',
        '/gitlab-pipeline-monitor/branch'
      ],
      WithDecryption: true //if you fore example want to encrypt the token - note that you will have to give the execution role permission to use the respective kms-key
    };

    ssm.getParameters(ssmParams, function (err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        callback(null, error);
      }
      else {
        config = {
          token: data.Parameters.find(x => x.Name === '/gitlab-pipeline-monitor/token').Value,
          baseUrl: data.Parameters.find(x => x.Name === '/gitlab-pipeline-monitor/baseUrl').Value,
          namespace: data.Parameters.find(x => x.Name === '/gitlab-pipeline-monitor/namespace').Value,
          branch: data.Parameters.find(x => x.Name === '/gitlab-pipeline-monitor/branch').Value
        }

        getProjectStates(config, callback, context);
      }
    });
  }
  else {
    getProjectStates(config, callback, context);
  }
};

function getProjectStates(config, callback, context) {
  let request = `${config.baseUrl}/${config.namespace}/projects?simple=true&private_token=${config.token}`;

  axios.get(request)
    .then(response => {
      var projects = response.data.map(x => {
        return { id: x.id, url: x.web_url, path: x.path_with_namespace, name: x.name, status: 'unkown' };
      });

      var states = projects.map(project => {
        return getStatus(project.id, config.baseUrl, config.token, config.branch);
      })

      Promise.all(states).then(values => {

        values.map(value => {
          let project = projects.filter(p => p.id == value.id)[0];
          project.status = value.status;
        });

        if (process.env.LOGQUEUEURL && process.env.LOGQUEUEURL.length > 0) {
          let logs = projects.map(project => {
            return {
              app: 'gitlab-pipeline-monitor',
              env: 'All',
              timestamp: new Date().toISOString(),
              level: 'Information',
              version: '1.0.0',
              correlationId: context.awsRequestId,
              logVersion: 2,
              service: project.name,
              status: project.status,
              message: `checked pipeline of ${project.name}`,
              url: project.url
            };
          });
          logToSqs(logs);
        }
        callback(null, { projects: projects });
      });
    })
    .catch(error => {
      console.log('project status could not be queried - check your token ');
      callback(null, { error: error });
    });
}

function getStatus(projectId, baseUrl, token, branch) {

  let request = `${baseUrl}/projects/${projectId}/pipelines?ref=${branch}&page=1&per_page=1&private_token=${token}`;
  let status = 'unknown';

  return axios.get(request)
    .then(response => {
      if (response.data && response.data.length > 0) {
        status = response.data[0].status;
      }
      return { id: projectId, status: status };
    })
    .catch(error => {
      console.log('project status could not be queried - check your token ');
      return { id: projectId, status: status };
    });
}

function logToSqs(data) {
  let params = {
    DelaySeconds: 10,
    MessageAttributes: {
      "Type": {
        DataType: "String",
        StringValue: "PipelineStatus"
      }
    },
    MessageBody: prepareMessageContent(data),
    QueueUrl: process.env.LOGQUEUEURL
  };

  sqs.sendMessage(params, function (err, data) {
    if (err) {
      console.log("Error", err);
    } else {
      console.log("Success", data.MessageId);
    }
  });
};

function prepareMessageContent(data) {
  let logs = data.reduce((acc, current) => {
    let currentLog = JSON.stringify(current);
    if (acc) {
      return `${acc}\n${currentLog}`;
    }
    else {
      return currentLog;
    }
  }, null);
  var compressed = zlib.gzipSync(logs).toString('base64');
  return compressed;
}
