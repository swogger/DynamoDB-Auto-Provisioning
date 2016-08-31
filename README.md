<h1>Dynamic Capacity Provisioning for DynamoDB</h1>

Tags: DynamoDB, Lambda, CloudWatch, Provisioning, Capacity

This project provides fully AWS based solution for automatic provisioning of capacity for DynamoDB. It utilizes CloudWatch for time scheduled invocation of Lambda functions which check the consumed resources and based on custom set of rules scales up or down the provisioned capacity.


![capacity](https://cloud.githubusercontent.com/assets/4025917/18130866/9ce43f28-6f88-11e6-8db3-8b197ae5dea5.png)

<h2>DynamoDB</h2>

Amazon’s DynamoDB is a managed NoSQL solution, which offers unique set of advantages: virtually infinite scalability, no infrastructure maintenance and simple access management. It does however come with few important constraints, the most important of which is the provisioned capacity. 

For each table in DynamoDB a specific number of reads and writes per second have to be set  based on the expected traffic. The service allows for short periods of burst activity above the provisioned limits, however if limits are exceeded for longer periods no reads or writes occur and provisioned capacity exceeded error is returned instead. 

To address this limitation there is already a set of solutions out there like Dynamic DynamoDB, which require spinning up and maintaining separate instance to run the code.

An alternative solution exists where no additional instances are required, but instead it takes advantage of another fairly new Amazon service - Lambda.


<h2>Lambda</h2>

Lambda allows the serverless deployment and execution of code in the AWS cloud. The entire underlying infrastructure and the prerequisites necessary to run Java, NodeJS and Python code are fully managed. 
In addition, access to resources is controlled through IAM roles, which simplifies the security administration and can easily be aligned with the overall access management policy of your AWS setup. 



<h2>Dynamic DynamoDB with Lambda</h2>

We will go briefly through the process of setting up and configuring the lambda function. The whole process should take up to 10 minutes. 
Setup your Lambda in 10 Easy Steps:
<ol>
<li>From your AWS management console, select Services menu > Lambda and click on the Create a Lambda Function Button.</li>
<li>Skip the template list. On the Configure Trigger screen, select the empty rectangle before the Lambda Icon and select CloudWatch Events - Schedule.</li>
<li>Keep the default settings for invocation every minute and Enable the Trigger. </li>
<li>Name your Lambda function and paste the code from Snippet 1 in the provided AWS code editor. (The DynamoDB table is called “dynamic-table”, you can edit the code accordingly)</li>
<li>Set the timeout to 10 seconds (occasionally DynamoDB provisioning takes a while)</li>
<li>Select Create a Custom Role from the Role dropdown.</li>
<li>On the IAM Role Summary screen select IAM Role : Create a new IAM Role.</li>
<li>Give the IAM Role a name, select edit and paste the contents of the Snippet 2 in the code editor box. </li>
<li>Click next and Create Function.  </li>
<li>Congratulations!</li>
</ol>

<h3>The Code</h3>

The code is written in Javascript, however it can easily be translated in Java or Python, given it it about 80 loc. 

It is split in several functions

getProvisionedCapacity which is a callback of the standard dynamoDB.describeTable function. The data parameter is an object that contain the provisioned Read and Write capacity. 

getConsumedCapacity utilizes the cloudwatch.getMetricStatistics which returns one metric at a time. It is used twice to obtain the consumed Read and Write capacity for the table.

setProvisionedCapacity sets the desired capacity values using the dynamodb.updateTable function.

calculateNewCapacity implements the custom rule for scaling up and down the new provisioned capacity. Please note that you are allowed to downscale a single table only 4 times per 24h. 

<h3>The Permissions</h3>

In order for your lambda function to access the necessary resources the following access rights are required: 

dynamoDB:DescribeTable to obtain the provisioned capacity; 
dynamoDB:UpdateTable to set the new values
CloudWatch:getMetricStatistics which will provide access to the consumed capacity, surprisingly it is not available from dynamoDB 


<h2>The End</h2>
At this point you should have the function successfully running every minute, checking “dynamic-table” consumption and adjusting the provisioned capacity accordingly. Further improvements will be added by storing configuration files in S3 file or triggering multiple functions using SQS to monitor a number of DynamoDB tables in the upcoming Part 2. 

