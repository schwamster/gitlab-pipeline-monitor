# gitlab-pipeline-monitor

This aws lambda can help you monitor your ci/cd pipelines.

It will query the status of all projects for either a given user or a group.

You can either use the result of the lambda e.g.

        {
        "projects": [
            {
            "id": 7703515,
            "url": "https://gitlab.com/9b193a18-33e9-497a-89db-60a920267cbf/project2",
            "path": "9b193a18-33e9-497a-89db-60a920267cbf/project2",
            "name": "project2",
            "status": "success"
            },
            {
            "id": 7703512,
            "url": "https://gitlab.com/9b193a18-33e9-497a-89db-60a920267cbf/project1",
            "path": "9b193a18-33e9-497a-89db-60a920267cbf/project1",
            "name": "project1",
            "status": "unknown"
            }
        ]
        }

Or configure a SQS-Queue to forward the results to.

# Getting started

this lambda is set up to be deployed with the serverless framework -> serverless.com
Follow their instructions to install the serverless cli.

After that all you have to do is deploy with 

        serverless deploy -v

If you want the logs to be forwarded to a SQS-Queue run this instead:

        serverless deploy -v --queue https://sqs.eu-west-1.amazonaws.com/{youraccount}/{yourqueuename}

!Hint: You may also be more restrictive with what queues the lambdas can send messages to - see sqs:SendMessage Action in the lambdas Policy in serverless.yml
!Hint: The lambda can easily be run on a schedule - just uncomment and change the events - schedule section in serverless.yml

Now the lambda is deployed and can be called. Since the lambda needs a bit of a config you will need to set that up. You can either do that parameters that
you call on execution or by setting parameters in Parameter Store. If you dont supply them per call you will have to supply them in the Parameter Store.

# Configuration

## parameters

* token - your gitlab access token
* baseUrl - base url of gitlab api - e.g. https://gitlab.com/api/v4 or https://gitlab.yourcompany.com/api/v4
* namespace - namespace of the projects (groups or users) - e.g. users/schwamster or groups/somegroup
* branch - branch you want to check - e.g. master

## setting the parameters when calling the lambda

your event should look something like this:

{
    "config": {
        "token": "{YOURTOKEN}",
        "namespace": "users/schwamster",
        "baseUrl": "https://gitlab.com/api/v4",
        "branch": "master"
    }
}

## setting the parameters via the Parameter Store

define the following paramerter in Parameter Store and set appropriate values:

* /gitlab-pipeline-monitor/token'
* /gitlab-pipeline-monitor/baseUrl'
* /gitlab-pipeline-monitor/namespace'
* /gitlab-pipeline-monitor/branch'






