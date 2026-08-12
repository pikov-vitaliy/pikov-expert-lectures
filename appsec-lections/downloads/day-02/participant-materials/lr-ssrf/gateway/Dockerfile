FROM python:3.12-alpine

RUN adduser -D -u 10003 gatewayuser
WORKDIR /app
COPY --chown=gatewayuser:gatewayuser gateway.py /app/gateway.py
USER gatewayuser
EXPOSE 8080
CMD ["python", "/app/gateway.py"]
