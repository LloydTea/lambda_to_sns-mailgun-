import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import dotenv from 'dotenv';

import AWS from 'aws-sdk';
import { v4 } from 'uuid';

const reg_emailinfo = new AWS.DynamoDB.DocumentClient();
const tableName = 'mailgun-db';
const sns_alert = new AWS.SNS();
const headers = {
  'content-type': 'application/json',
};

//Configure Your Envronmental Variable
dotenv.config({
  path: '.env',
});

console.log('Loading function');

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  //Reading The JSON Data
  const mailgun_content = JSON.parse(event.body || '');

  let timestamp: string = mailgun_content.items[0].timestamp,
    event_type: string = mailgun_content.items[0].event,
    Provider: string = mailgun_content.items[0].envelope.sender;

  //Email Provider Variable
  Provider = Provider.slice(-11);

  //Checking Email Information
  console.log(timestamp);
  console.log(event_type);
  console.log(Provider);

  //Dynamo DB Parameter
  const email_info = {
    ...mailgun_content,
    EmailId: v4(),
  };

  //SNS Message And Topic
  let sns_message: string = '{ \n Provider: ${Provider} \n Timestamp: ${timestamp} \n Event: ${event_type} \n}';
  const topicArn = process.env.ARN_SNS;

  //Check Your SNS Topic ARN
  console.log(topicArn);

  var params = {
    Message: sns_message,
    TopicArn: topicArn,
  };

  //Inserting Into Dynamodb
  await reg_emailinfo
    .put({
      TableName: tableName,
      Item: email_info,
    })
    .promise();

  //Sending SNS Alert
  await sns_alert
    .publish(params, function (err, data) {
      if (err) {
        console.log(err, data);
      } else {
        console.log(err);
      }
    })
    .promise();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(email_info),
  };
};
