import 'babel-polyfill';
const { ApolloServer, gql } = require('apollo-server-lambda');
const { RedisCache } = require('apollo-server-redis');
const { RESTDataSource } = require('apollo-datasource-rest');

const AWSXRay = require('aws-xray-sdk');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

class NYTIMESAPI extends RESTDataSource {
  baseURL = ' https://api.nytimes.com/svc/search/v2/articlesearch.json';  
  async searchNYArticle(q) {
    // https://api.nytimes.com/svc/search/v2/articlesearch.json
    const result = await this.get(`?q=${q}&api-key=${process.env.NY_TIMES_APIKEY}`);
    return result.response && result.response.docs ? result.response.docs : []    
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
    connectTimeout: 5000,
    reconnectOnError: function (err) {
      console.log('Reconnect on error', err)
      var targetError = 'READONLY'
      if (err.message.slice(0, targetError.length) === targetError) {
        // Only reconnect when the error starts with "READONLY"
        return true
      }
    },
    retryStrategy: function (times) {
      console.log('Redis Retry', times)
      if (times >= 3) {
        return undefined
      }
      var delay = Math.min(times * 50, 2000)
      return delay
    },
    socket_keepalive: false,
    host: 
      process.env.IS_OFFLINE==='true' 
      ?
      '127.0.0.1'
      :
      process.env.REDIS_HOST,
    port: 
      process.env.IS_OFFLINE==='true' 
      ?                     
      6379
      :                        
      parseInt(process.env.REDIS_PORT),
    password: 
      process.env.IS_OFFLINE==='true' ?                    
      ''
      :
      process.env.REDIS_PASSWORD,
  }),
  context: ({ event, context }) => ({
    headers: event.headers,
    functionName: context.functionName,
    event,
    context,
  })
});

exports.graphqlHandler = (event, context, callback) => {
  const handler = server.createHandler({  
      cors: {
        origin: '*',
        credentials: true,
      },
  });
  context.callbackWaitsForEmptyEventLoop = false;
  return handler(event, context, callback);
}