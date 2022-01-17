const urlModel = require("../models/urlModel.js")
const validUrl = require('valid-url')
const shortid = require('shortid')
const baseUrl = 'http://localhost:3000'

//*************************************CAshing Implementation******************************************** */

const redis = require("redis");//npm i redis@3.1.2

const { promisify } = require("util");//promisify is a functionName

//Connect to redis----go to redis(website---sign up ---take authentication details)
const redisClient = redis.createClient(
   15792,
  "redis-15792.c245.us-east-1-3.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("GzldTAyLi4qR6eBL3q0fpsmMNCyVWcMC", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});
redisClient.on("error", async function(){
   console.log("connection failed", error)
})

//1. connect to the server
//2. use the commands :npm i express


//Connection setup for redis

const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);

//*************************************CAshing Implementation------ends******************************************** */


//  ISVALID   REQUESTBODY FUNCTION
const isValidRequestBody = function (requestBody) {
   return Object.keys(requestBody).length > 0
}
//  ISVALID   FUNCTION
const isValid = function (value) {
   if (typeof value === 'undefined' || value === null) return false
   if (typeof value === 'string' && value.trim().length === 0) return false
   return true;
}

//VALIDATE URL
 function isValidURL(string) {
   var res = string.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
   return (res !== null) // from stackOverflow
 }
// This is the first post api to create longer to shorter URL.
const createUrl = async function (req, res) {
   let body = req.body
   let longUrl = req.body.longUrl
   if (!isValidRequestBody(body)) {
      res.status(400).send({ status: false, msg: 'Invalid body' })
      return
   }
   if (!isValid(longUrl)) {
      res.status(400).send({ status: false, msg: 'Enter appropriate URL' })
      return
   }
   if (!isValidURL(longUrl)) {
      res.status(400).send({ status: false, msg: 'Enter appropriate URL / Your url not exist' })
      return
   }
   longUrl = longUrl.trim()
   if (!validUrl.isUri(baseUrl)) {
      return res.status(400).send('Invalid base URL')//validUrl.isUri(suspect) ---packg is checking url is corret or not
   }
   if (!validUrl.isUri(longUrl)) {
      return res.status(400).send('Invalid  Long URL')//validUrl.isUri(suspect) ---packg is checking url is corret or not
   }
   if (validUrl.isUri(longUrl)) {

      try {
         const urlCode = shortid.generate().toLowerCase()
         let checkUrl = await urlModel.findOne({ longUrl })
         if (checkUrl) {
            res.send({ message: "You have already created shortUrl for the requested URL as given below", data: checkUrl })
         } else {
           
            const shortUrl = baseUrl + '/' + urlCode
            const storedData = { longUrl, shortUrl, urlCode }
            let savedData = await urlModel.create(storedData);
            res.status(201).send({ status: true, data: savedData });
         }
      } catch (err) {
         res.status(500).send({ status: false, data: err.message })
      }
   } else {
      res.status(400).send('Invalid longUrl')
   }
}


// This is my second get api to redirect from shorter to original (longer) URL

//*******************************************Normal code********************************************************* */
// const getUrl = async function (req, res) {
//    try {
//       let paramsUrl = req.params.urlCode
//       let test = paramsUrl.trim()
//       //console.log(paramsUrl)
//       if (!isValid(test)) {
//          res.status(400).send({ status: false, msg: 'Enter appropriate URL' })
//          return
//       }
//       const urlExist = await urlModel.findOne({ urlCode: test })
//       if (urlExist) {
//          return res.redirect(urlExist.longUrl)
//       } else {
//          return res.status(400).send('Sorry, there is no url for this request')
//       }
//    } catch (err) {
//       res.status(500).send('Server Error')
//    }
// }
//*******************************************Normal code---end********************************************************* */




const getUrl = async function (req, res) {
   try {
      let paramsUrl = req.params.urlCode
      let test = paramsUrl.trim().toLowerCase()
    //  console.log(paramsUrl)
      if (!isValid(test)) {
         res.status(400).send({ status: false, msg: 'Enter appropriate URLcode' })
         return
      }
      let cachedUrlData = await GET_ASYNC(`${test}`)
      let data =JSON.parse(cachedUrlData)
     // console.log(cachedUrlData)
      //console.log(typeof (cachedUrlData))
       
      if(data) {
         //console.log("insider....")
         return res.status(302).redirect(data.longUrl)
       } else {
                   
         const newUrl = await urlModel.findOne({ urlCode: test })
        // console.log(newUrl)
         if (!isValid(newUrl)) {
            return res.status(400).send({ status: false, msg: 'UrlCode does not exist' })   
         }
         await SET_ASYNC(`${test}`, JSON.stringify(newUrl))
         return res.status(302).redirect(newUrl.longUrl)
       }
} catch (err) {
   res.status(500).send({status:false, msg:err.message})
}
}

      
      
module.exports.createUrl = createUrl
module.exports.getUrl = getUrl