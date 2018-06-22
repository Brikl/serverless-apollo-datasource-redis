import 'babel-polyfill';
const { ApolloServer, gql } = require('apollo-server-lambda');
const { RedisCache } = require('apollo-server-redis');
const { RESTDataSource } = require('apollo-datasource-rest');

const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

var ssm = new AWS.SSM({
  region: 'us-east-1'
});
var REDIS_HOST
var REDIS_PORT
var REDIS_PASSWORD
var NY_TIMES_APIKEY
try {
  if(process.env.IS_OFFLINE){
    NY_TIMES_APIKEY = process.env.NY_TIMES_APIKEY    
  }else{
    var params = {
      Names: [
        '/apollo-test/'+process.env.SERVERLESS_STAGE+'/REDIS_HOST',
        '/apollo-test/'+process.env.SERVERLESS_STAGE+'/REDIS_PORT',
        '/apollo-test/'+process.env.SERVERLESS_STAGE+'/REDIS_PASSWORD',
        '/apollo-test/'+process.env.SERVERLESS_STAGE+'/NY_TIMES_APIKEY',
      ],
      WithDecryption: true
    };
    ssm.getParameters(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else{
        console.log(
          'data',
          data
        )
        // if(
        //   data &&
        //   data.Parameters &&
        //   data.Parameters[0] &&
        //   data.Parameters[0].Value
        // ){
        //   REDIS_HOST = data.Parameters[0].Value
        // }
      }
    }); 
  }  
} catch (error) {
  console.log(error)
}


class NYTIMESAPI extends RESTDataSource {
  baseURL = ' https://api.nytimes.com/svc/search/v2/articlesearch.json';  
  async searchNYArticle(q) {
    // https://api.nytimes.com/svc/search/v2/articlesearch.json
    const result = await this.get(`?q=${q}&api-key=${NY_TIMES_APIKEY}`);
    if(result.response&&result.response.docs){
      return result.response.docs
    }else{
      return []
    }
  }
}

const typeDefs = gql`
  type Query {
    searchNYTimes(q: String): [Doc]
  }
  type Doc @cacheControl(maxAge: 6000) {
    web_url: String
    snippet: String
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    searchNYTimes: async (_source, { q }, { dataSources }) => {
      return dataSources.nytimesAPI.searchNYArticle(q);
    }    
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  tracing: true,
  cacheControl: {
    defaultMaxAge: 5,
    stripFormattedExtensions: false,
    calculateCacheControlHeaders: false,
  },
  dataSources: () => {
    return {
      nytimesAPI: new NYTIMESAPI(),
    };
  },  
  cache: new RedisCache({
    host: 
      process.env.IS_OFFLINE 
      ?
      '127.0.0.1'
      :
      REDIS_HOST,
  port: 
      process.env.IS_OFFLINE 
      ?                     
      6379
      :                        
      REDIS_PORT,                    
  password: 
      process.env.IS_OFFLINE ?                    
      ''
      :
      REDIS_PASSWORD,
  }),
  context: ({ event, context }) => ({
    headers: event.headers,
    functionName: context.functionName,
    event,
    context,
  })
});

exports.graphqlHandler = server.createHandler({
  cors: {
    origin: '*',
    credentials: true,
  },
});