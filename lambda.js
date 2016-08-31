var AWS = require('aws-sdk');

exports.handler = (event, context, callback) => {
    var now = new Date();
    var dynamodb = new AWS.DynamoDB();
    var cloudwatch = new AWS.CloudWatch();
    var table = 'dynamic-table';

    dynamodb.describeTable({TableName: table}, function getProvisionedCapacity (errProvisioned, data){

        var provisionedRead = (data && data.Table && data.Table.ProvisionedThroughput.ReadCapacityUnits) || 1;
        var provisionedWrite = (data && data.Table && data.Table.ProvisionedThroughput.WriteCapacityUnits) || 1;
        var currentDecreaseCount = (data && data.Table && data.Table.ProvisionedThroughput.NumberOfDecreasesToday) || 0;
        var lastDecreaseDate =  new Date(data && data.Table && data.Table.ProvisionedThroughput.LastDecreaseDateTime) || now;
        var canDecrease = ((now - lastDecreaseDate)/(6 * 60 * 60 * 1000)) > 1; // if more than 6h after last decrease

        getConsumedCapacity('ConsumedWriteCapacityUnits', function(errWrite, consumedWrite){
            getConsumedCapacity('ConsumedReadCapacityUnits', function(errRead, consumedRead){

                if(errProvisioned || errWrite || errRead) {
                    return  calback({
                        errProvisioned:errProvisioned,
                        errCapacity:{
                            errRead:errRead,
                            errWrite:errWrite
                        }
                    }, null);
                }

                var newRead = calculateNewCapacity(provisionedRead, consumedRead, canDecrease);
                var newWrite = calculateNewCapacity(provisionedWrite, consumedWrite, canDecrease);
                var noChange = (provisionedRead === newRead) && (provisionedWrite === newWrite );

                if(noChange){
                    callback(null, {consumedRead:consumedRead, consumedWrite:consumedWrite, provisionedRead:provisionedRead, provisionedWrite:provisionedWrite} );
                }else{
                    setProvisionedCapacity(newRead, newWrite, callback);
                }

            });
        });
    });

    /* increase the consumed capacity by 50% ,
     ** decrease (if allowed) by 50% of the unconsumed capacity */
    function calculateNewCapacity(provisioned, consumed, decrease){
        if(provisioned < consumed){
            return Math.ceil(consumed*1.5);
        }else if(decrease){
            return consumed + Math.ceil((provisioned-consumed)/2);
        }else{
            return provisioned;
        }
    }

    function getConsumedCapacity(metric, complete){
        var params = {
            Period: 60,
            StartTime: new Date(now - (60*1000)),
            EndTime: now,
            MetricName: metric,
            Namespace: 'AWS/DynamoDB',
            Unit: 'Count',
            Statistics: ['Average'],
            Dimensions: [
                {
                    Name: 'TableName',
                    Value: table
                }]
        };

        cloudwatch.getMetricStatistics(params, function(err, data) {
            complete(err, data.Datapoints.length > 0 && data.Datapoints[0].Average || 0 );
        });
    }

    function setProvisionedCapacity(read, write, complete){
        var params = {
            TableName: table,
            ProvisionedThroughput: {
                ReadCapacityUnits : read,
                WriteCapacityUnits : write
            }
        };

        dynamodb.updateTable(params, complete);
    }
};