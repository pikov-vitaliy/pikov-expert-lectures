FROM python:3.12-alpine

RUN adduser -D -u 10002 internaluser
WORKDIR /app
COPY --chown=internaluser:internaluser app.py /app/app.py
USER internaluser
EXPOSE 9000
CMD ["python", "/app/app.py"]
