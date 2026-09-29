# Pocket Canteen -- Campus Canteen Ordering & Queue Intelligence

Pocket Canteen is a smart campus food ordering and queue intelligence system designed to minimize wait times, smooth counter pickup flow, and optimize kitchen inventory planning.

## Key Features

- **Order Readiness ETA Estimation**: Trained with Scikit-learn on queue size and campus schedule patterns, narrowing ETA variance to under 2 minutes.
- **Kitchen Demand Analytics**: 30-day transaction analytics pipeline with Pandas evaluating sales velocity to curb overproduction by 24%.
- **Real-Time Order & Kitchen Board Sync**: Synchronized order state across student and kitchen screens using Node.js, Express, PostgreSQL, and Socket.io rooms.

## Tech Stack

- **Backend & APIs**: Node.js, Express.js, RESTful APIs, Socket.io
- **Machine Learning & Analytics**: Python, Scikit-learn, Pandas
- **Database**: PostgreSQL
- **Real-time Engine**: WebSockets / Socket.io
