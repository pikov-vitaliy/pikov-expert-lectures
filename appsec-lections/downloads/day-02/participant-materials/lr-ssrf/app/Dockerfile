FROM python:3.12-alpine

RUN adduser -D -u 10001 appuser
WORKDIR /app
COPY --chown=appuser:appuser app.py /app/app.py
USER appuser
EXPOSE 8080
CMD ["python", "/app/app.py"]
