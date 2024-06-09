import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_s3 as s3, aws_lambda as lambda, aws_iam as iam, aws_ecs as ecs } from 'aws-cdk-lib';
import { bedrock } from "@cdklabs/generative-ai-cdk-constructs";
import { aws_s3_deployment as s3deploy } from 'aws-cdk-lib';
import { aws_ecs_patterns as ecsPatterns } from 'aws-cdk-lib';

export class KnowledgeBasesApplication extends cdk.Stack {  
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const kbSource = new s3.Bucket(this, 'KnowledgeBaseSourceFiles', {
      versioned: true
    })
    
    new s3deploy.BucketDeployment(this, 'DeployShareholderLetters', {
      sources: [s3deploy.Source.asset('./assets')],
      destinationBucket: kbSource,
      destinationKeyPrefix: 'dataset'
    })

    const kb = new bedrock.KnowledgeBase(this, 'kb', {
        embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1,
    })

    const s3DataSource = new bedrock.S3DataSource(this,'docsDataSource', {
        bucket: kbSource,
        knowledgeBase: kb,
        dataSourceName: 'dataset',
        chunkingStrategy: bedrock.ChunkingStrategy.FIXED_SIZE,
        maxTokens: 500,
        overlapPercentage: 20,
    })

    const kbLambda = new lambda.Function(this, 'kbLambda', { 
      runtime: lambda.Runtime.PYTHON_3_10,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'kb-retrieveAndGenerate.lambda_handler',
      environment: {
        'KNOWLEDGE_BASE_ID': kb.knowledgeBaseId,
      },
    })

    kbLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['bedrock:RetrieveAndGenerate', 'bedrock:Retrieve', 'bedrock:InvokeModel'],
      resources: ['*']
    }))

    new cdk.CfnOutput(this, 'KnowledgeBaseId', {value: kb.knowledgeBaseId});
    new cdk.CfnOutput(this, 'DataSourceId', {value: s3DataSource.dataSourceId});

    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      inlinePolicies: {
        'kbLambda': new iam.PolicyDocument({
          statements: [new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['lambda:InvokeFunction'],
            resources: [kbLambda.functionArn]
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject'],
            resources: [kbSource.bucketArn + '/*']
          })]
        })
      }
    })

    const loadBalancedService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'Service', {
        memoryLimitMiB: 1024,
        cpu: 512,
        taskImageOptions: {
            image: ecs.ContainerImage.fromAsset('./'),
            environment: {
              'LAMBDA_NAME': kbLambda.functionName
            },
            containerPort: 8501,
            taskRole: taskRole
        },
    })

    new cdk.CfnOutput(this, 'ServiceUrl', {value: loadBalancedService.loadBalancer.loadBalancerDnsName});
  }
}

const app = new cdk.App();
new KnowledgeBasesApplication(app, 'KnowledgeBasesApplicationDemo');
app.synth();