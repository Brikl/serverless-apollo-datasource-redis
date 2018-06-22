# serverless-apollo-datasource-redis

Inspired by https://dev-blog.apollodata.com/easy-and-performant-graphql-over-rest-e02796993b2b

This is a sample to run Apollo Server rc2 on AWS Lambda with external Redis cache for REST or other data sources.

As a sample we are using NY Times API articles search:
https://developer.nytimes.com/article_search_v2.json

For local development you may create a secret.yml

    ENGINE_API_KEY: YOURENGINEAPIKEY
    NY_TIMES_APIKEY: YOURNYTIMEAPIKEY
