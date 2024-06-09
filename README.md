# QA Application with Bedrock and Knowledge Bases

This repository contains resources to deploy a demo Q&A application using knowledge bases. A streamlit web application will be deployed to ECS. 

# Deploy Infra

### Install the needed dependencies

`npm install` 

### Deploy the CDK Infrastructure

`cdk deploy`

### Sync KB

2 outputs will be generated from cloudformation 

```
Genai101WorkshopStack.DataSourceId 
Genai101WorkshopStack.KnowledgeBaseId
```

These IDs can be used to sync your KB. NOTE: This will have to be run prior to first app use

` ./scripts/sync-kb.sh ${KnowledgeBaseId} ${DataSourceId}` 
