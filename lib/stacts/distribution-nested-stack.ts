import { NestedStack } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as cdk from 'aws-cdk-lib';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { DistributionNestedStackProps } from "./DistributionNestedStackProps";

export class DistributionNestedStack extends NestedStack {
    public readonly cloudFrontDistributionUrl: string;

    constructor(scope: Construct, id: string, props: DistributionNestedStackProps) {
        super(scope, id, props);
        /**
         * Creates an S3 bucket for CloudFront logs.
         *
         * @type {s3.Bucket}
         */
        const logBucket: s3.Bucket = new s3.Bucket(this, `${props.resourcePrefix}-clfmService-LogsBucket`, {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            lifecycleRules: [
                {
                    expiration: cdk.Duration.days(7),
                },
            ],
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            accessControl: s3.BucketAccessControl.LOG_DELIVERY_WRITE,
        });

        /**
         * Defines a custom cache policy for CloudFront.
         *
         * @type {cloudfront.CachePolicy}
         */
        const customCachePolicy: cloudfront.CachePolicy = new cloudfront.CachePolicy(this, `${props.resourcePrefix}-CustomCachePolicy`, {
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
            defaultTtl: cdk.Duration.days(1),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.seconds(60),
        });

        /**
         * Creates a CloudFront distribution for the TypeScript Lambda function.
         *
         * @type {cloudfront.Distribution}
         */
        const cloudFrontDistribution: cloudfront.Distribution = new cloudfront.Distribution(this, `${props.resourcePrefix}-cloudFrontDistribution`, {
            defaultBehavior: {
                origin: new origins.FunctionUrlOrigin(props.originVerifyFnUrl, {
                    originShieldEnabled: true,
                    originShieldRegion: props.cdkDeployRegion,
                    customHeaders: {
                        [props.originVerify.headerName]: props.originVerify.headerValue,
                    },
                }),
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                cachePolicy: customCachePolicy,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            logBucket: logBucket,
            logFilePrefix: 'cloudfront-logs/',
        });

        /**
         * Sets the CloudFront distribution URL for the TypeScript Lambda function.
         *
         * @type {string}
         */
        this.cloudFrontDistributionUrl = `https://${cloudFrontDistribution.distributionDomainName}`;
    }
}