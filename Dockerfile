FROM python:3.12-slim

WORKDIR /app

COPY ./app/* .

RUN pip3 install -r requirements.txt

EXPOSE 8501

ENTRYPOINT ["streamlit", "run", "qa-bot.py", "--server.port=8501", "--server.address=0.0.0.0"]
