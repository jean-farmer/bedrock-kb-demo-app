#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { KnowledgeBasesApplication } from '../lib/qa-kb-stack';

const app = new cdk.App();
new KnowledgeBasesApplication(app, 'KnowledgeBasesApplication');