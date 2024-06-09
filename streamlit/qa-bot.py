import streamlit as st
import boto3
import json
import os

region = boto3.Session().region_name
session = boto3.Session(region_name=region)
lambda_client = session.client('lambda')

sessionId = ""

st.title("Knowledge Bases with Bedrock")

#initialize
if "messages" not in st.session_state:
    st.session_state.messages = []

# Initialize session id
if 'sessionId' not in st.session_state:
    st.session_state['sessionId'] = sessionId

def generate_presigned_url(bucket_uri):
    s3 = boto3.client('s3')
    bucket_name, key = bucket_uri.split('/', 2)[-1].split('/', 1)
    try:
        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': key},
            ExpiresIn=600
        )
        return presigned_url
    except ClientError as e:
        st.error(f"Error generating presigned URL: {e}")

# Display chat messages from history on app rerun
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# React to user input
if prompt := st.chat_input("How can I help you?"):

    # Display user input in chat message container
    question = prompt
    st.chat_message("user").markdown(question)

    # Call lambda function to get response from the model
    payload = json.dumps({"question":prompt,"sessionId": st.session_state['sessionId']})

    result = lambda_client.invoke(
        FunctionName=os.environ["LAMBDA_NAME"],
        Payload=payload
    )

    result = json.loads(result['Payload'].read().decode("utf-8"))
    
    answer = result['body']['answer']
    sessionId = result['body']['sessionId']
    #Add citations
    citations = result['body']['citations']

    st.session_state['sessionId'] = sessionId

    # Add user input to chat history
    st.session_state.messages.append({"role": "user", "content": question})

    # Display assistant response in chat message container
    with st.chat_message("assistant"):
        #Loop over the citations list and display each citation in a separate chat message
        for citation in citations:
            display_text = citation['generatedResponsePart']['textResponsePart']['text']
            st.markdown(display_text)
            display_link=''
            for reference in citation['retrievedReferences']:
                url = reference['location']['s3Location']['uri']
                help_text=reference['content']['text']
                s3_presigned_url = generate_presigned_url(url)
                display_link = f"[Doc link]({s3_presigned_url})"
                st.markdown(display_link, help=help_text)

    # Add assistant response to chat history
    st.session_state.messages.append({"role": "assistant", "content": answer})