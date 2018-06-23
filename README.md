# serverless-apollo-datasource-redis

The full tutorial and article can be found here https://medium.com/brikl-engineering/serverless-graphql-cached-in-redis-with-apollo-server-2-0-f491695cac7f

Inspired by https://dev-blog.apollodata.com/easy-and-performant-graphql-over-rest-e02796993b2b

This is a sample to run Apollo Server rc2 on AWS Lambda with external Redis cache for REST or other data sources.

As a sample we are using NY Times API articles search:
https://developer.nytimes.com/article_search_v2.json

## Deployment 
serverless deploy --region us-east-1 --stage staging --profile yourprofilename
