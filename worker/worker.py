"""
AI Task Worker — polls Redis queue and processes tasks.
"""
import json
import os
import time
import logging
from datetime import datetime, timezone

import redis
from bson import ObjectId
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/aitasks")
QUEUE_KEY = "task_queue"
POLL_INTERVAL = float(os.getenv("WORKER_POLL_INTERVAL", "1"))


def get_redis():
    r = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=5)
    r.ping()
    return r


def get_mongo():
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    return client


def process_operation(operation: str, text: str) -> str:
    if operation == "uppercase":
        return text.upper()
    elif operation == "lowercase":
        return text.lower()
    elif operation == "reverse":
        return text[::-1]
    elif operation == "wordcount":
        count = len(text.split())
        return f"Word count: {count}"
    else:
        raise ValueError(f"Unknown operation: {operation}")


def append_log(db, task_id, message: str):
    db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$push": {"logs": {"message": message, "timestamp": datetime.now(timezone.utc)}}},
    )


def process_job(db, job: dict):
    task_id = job["taskId"]
    operation = job["operation"]
    input_text = job["inputText"]

    log.info(f"Processing task {task_id} | op={operation}")

    # Mark as running
    db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {"status": "running"},
            "$push": {"logs": {"message": "Worker picked up task", "timestamp": datetime.now(timezone.utc)}},
        },
    )

    try:
        result = process_operation(operation, input_text)

        db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {"status": "success", "result": result},
                "$push": {"logs": {"message": f"Completed successfully", "timestamp": datetime.now(timezone.utc)}},
            },
        )
        log.info(f"Task {task_id} succeeded")

    except Exception as exc:
        error_msg = str(exc)
        db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {"status": "failed"},
                "$push": {"logs": {"message": f"Error: {error_msg}", "timestamp": datetime.now(timezone.utc)}},
            },
        )
        log.error(f"Task {task_id} failed: {error_msg}")


def main():
    log.info("Worker starting...")

    # Retry connections on startup
    r = None
    mongo_client = None
    for attempt in range(10):
        try:
            r = get_redis()
            mongo_client = get_mongo()
            log.info("Connected to Redis and MongoDB")
            break
        except Exception as e:
            log.warning(f"Connection attempt {attempt + 1}/10 failed: {e}")
            time.sleep(3)
    else:
        log.error("Could not connect to dependencies. Exiting.")
        raise SystemExit(1)

    db = mongo_client.get_default_database()

    log.info(f"Polling queue '{QUEUE_KEY}' every {POLL_INTERVAL}s")

    while True:
        try:
            # Blocking pop with timeout
            item = r.blpop(QUEUE_KEY, timeout=5)
            if item:
                _, raw = item
                job = json.loads(raw)
                process_job(db, job)
        except redis.exceptions.ConnectionError as e:
            log.error(f"Redis connection lost: {e}. Reconnecting...")
            time.sleep(3)
            try:
                r = get_redis()
            except Exception:
                pass
        except Exception as e:
            log.error(f"Unexpected error: {e}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
