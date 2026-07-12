# MediConnect Backend Documentation

Welcome to the backend documentation for **MediConnect**, a secure, highly scalable healthcare scheduling and consultation platform. This backend is built using **Node.js**, **Express**, and **MongoDB/Mongoose**, and features integration with **Razorpay** for payment processing, **Cloudinary** for secure media/document storage, and custom slot generation logic for doctors.

---

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Folder & Directory Structure](#folder--directory-structure)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Database & Models (Schema Details)](#database--models-schema-details)
5. [API Routes & Endpoints](#api-routes--endpoints)
6. [Key Architectural Workflows](#key-architectural-workflows)
   - [Authentication & JWT Middleware](#1-authentication--jwt-middleware)
   - [Slot Generation Engine](#2-slot-generation-engine)
   - [Appointment Booking & Payment Transaction Flow](#3-appointment-booking--payment-transaction-flow)
7. [Installation & Local Setup](#installation--local-setup)

---

## Architecture Overview

MediConnect employs a model-view-controller (MVC) inspired design tailored for RESTful APIs:
- **Routing Layer**: Validates HTTP requests, parses routes, and handles authorization using custom JWT middleware.
- **Controller Layer**: Encapsulates core business logic, database queries, and third-party API integrations (Razorpay, Cloudinary).
- **Data Layer**: Powered by MongoDB through Mongoose schemas, featuring indexes designed for fast dashboard queries and double-booking prevention.
- **Utility & Middleware Layer**: Contains general-purpose classes for standardized API response/error structures and centralized async error catching.

---

## Folder & Directory Structure

```text
backend/
├── db/
│   └── index.js                        # Database connection setup using Mongoose
├── controllers/
│   ├── appointment.controllers.js       # Core slot booking, holding, and payment confirmation logic
│   ├── auth.controllers.js              # Doctor & patient signup, login, and token administration
│   ├── doctor.controllers.js            # Availability settings, services (rates/durations), and appointment lists
│   ├── patient.controllers.js           # Patient appointments and profiling
│   └── payment.controllers.js           # Razorpay order creator
├── middlewares/
│   ├── auth.middleware.js               # JWT verification middleware (accessToken & refreshToken logic)
│   └── multer.middleware.js             # Local file destination utility before Cloudinary sync
├── models/
│   ├── appointment.models.js            # Main booking database record with state transitions
│   ├── availability.models.js           # Day-specific scheduling options (startTime, endTime, breaks)
│   ├── doctor.models.js                 # Doctor profile information, clinical details, and licenses
│   ├── patient.models.js                # Patient demographics and profile references
│   ├── payment.models.js                # Razorpay transactions tracking schema
│   ├── services.models.js               # Services list and prices provided by specific doctors
│   ├── slot.models.js                   # Available, locked, or booked time slots
│   └── user.models.js                   # Primary authentication collection (passwords, JWT helper methods)
├── routes/
│   ├── appointment.routes.js            # Endpoint routes for slot searches and payments
│   ├── auth.routes.js                   # Endpoint routes for patient/doctor signup and authentication
│   ├── doctor.routes.js                 # Endpoint routes for clinic availability and service plans
│   └── patient.routes.js                # Endpoint routes for patient details
├── utils/
│   ├── ApiError.js                      # Custom Class extending standard Error for custom status codes
│   ├── ApiResponse.js                   # Standardized JSON response envelope
│   ├── asyncHandler.js                  # Express helper wrapper to catch promise exceptions cleanly
│   ├── cloudinary.js                    # Cloudinary upload client implementation
│   ├── generateAccessRefreshToken.js    # JWT generation logic
│   └── slotGenerator.js                 # Slot generator engine with breaks and overnight shifts validation
├── app.js                               # Express application setup, global middleware, and error catching
├── constants.js                         # Application wide constants
└── index.js                             # Primary entry point (env configurations and server runner)
```

---

## Environment Variables Reference

Create a `.env` file in the root of the `backend` folder with the following variables:

```ini
PORT=8000
MONGODB_URI=mongodb://localhost:27017/medi_connect
CORS_ORIGIN=http://localhost:5173

ACCESS_TOKEN_SECRET=your_jwt_access_token_secret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=your_jwt_refresh_token_secret
REFRESH_TOKEN_EXPIRY=7d

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

---

## Database & Models (Schema Details)

MediConnect organizes its data model into distinct mongoose collections to support role-based segregation, dynamic availability, and transaction auditing:

### 1. `User` ([user.models.js](file:///d:/medi_connect/medi_connect/backend/models/user.models.js))
- Handles credentials and roles.
- **Fields**: `email` (Unique, Lowercase), `password` (Hashed), `role` (`"patient"`, `"doctor"`, `"admin"`), `refreshToken`.
- **Methods**: `isPasswordCorrect(password)`, `generateAccessToken()`, `generateRefreshToken()`.

### 2. `Doctor` ([doctor.models.js](file:///d:/medi_connect/medi_connect/backend/models/doctor.models.js))
- Detailed profiles for certified medical professionals.
- **Fields**: `userId` (Ref User), `name`, `number` (Unique), `description`, `specialization` (Enum of medical categories), `clinic` (Name, address, city, state, pincode, coordinates), `licensePdf` (Cloudinary URL), `profilePhoto`, `approved` (Boolean), `approvedAt`.

### 3. `Patient` ([patient.models.js](file:///d:/medi_connect/medi_connect/backend/models/patient.models.js))
- Information representing clients booking appointments.
- **Fields**: `userId` (Ref User), `name`, `phone`, `age`, `gender` (`"Male"`, `"Female"`, `"Other"`), `profilePhoto`.

### 4. `Availability` ([availability.models.js](file:///d:/medi_connect/medi_connect/backend/models/availability.models.js))
- Doctor shift preferences per date.
- **Fields**: `doctorId` (Ref Doctor), `date` (Date), `isAvailable` (Boolean), `startTime` ("HH:mm"), `endTime` ("HH:mm"), `breaks` (Array of `{ startTime, endTime }`).
- **Indexes**: Unique index on `{ doctorId: 1, date: 1 }`.

### 5. `Service` ([services.models.js](file:///d:/medi_connect/medi_connect/backend/models/services.models.js))
- Individual consultation services offered by a doctor.
- **Fields**: `doctorId` (Ref Doctor), `name`, `description`, `price`, `duration` (Minutes), `isActive`.

### 6. `Slot` ([slot.models.js](file:///d:/medi_connect/medi_connect/backend/models/slot.models.js))
- The granular timeline blocks available for bookings.
- **Fields**: `doctorId` (Ref Doctor), `startDateTime` (Date), `endDateTime` (Date), `status` (`"available"`, `"locked"`, `"booked"`, `"unavailable"`, `"expired"`), `isActive` (Boolean).
- **Indexes**: Unique index on `{ doctorId: 1, startDateTime: 1 }`.

### 7. `Appointment` ([appointment.models.js](file:///d:/medi_connect/medi_connect/backend/models/appointment.models.js))
- Orchestrates patient-doctor consultation schedules.
- **Fields**: `patient` (Ref Patient), `doctor` (Ref Doctor), `slot` (Ref Slot), `services` (Array of nested services), `startDateTime`, `endDateTime`, `status` (`"pending"`, `"confirmed"`, `"reschedule-required"`, `"cancelled"`, `"attended"`, `"no-show"`, `"expired"`), `paymentStatus` (`"pending"`, `"paid"`, `"failed"`, `"refunded"`), `statusHistory` (Array of audits), `isActive`.
- **Preventative Indexes**: Unique index on `{ doctor: 1, startDateTime: 1 }` prevents double bookings at the database tier.

### 8. `Payment` ([payment.models.js](file:///d:/medi_connect/medi_connect/backend/models/payment.models.js))
- Tracks Razerpay orders and processing results.
- **Fields**: `appointment` (Ref Appointment), `patient` (Ref Patient), `doctor` (Ref Doctor), `amount`, `tokenAmount`, `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `status` (Enum), `paymentMethod`, `paidAt`, `refundedAt`.

---

## API Routes & Endpoints

### 🔑 Authentication Routes (`/api/v1/auth`)
*   `POST /signup/doctor`: Registers a doctor profile. Accepts form-data with file fields: `licensePdf` (Required) and `profilePhoto` (Optional).
*   `POST /signup/patient`: Registers a patient profile. Accepts form-data with file field: `profilePhoto` (Required).
*   `POST /login`: Log in to get tokens. Returns standard Access/Refresh JWT payload. If the role is doctor, prevents authentication if `approved` is false.
*   `POST /logout` `[Secured]`: Clears accessToken and refreshToken cookies and updates the User record in database.

### 🩺 Doctor-specific Routes (`/api/v1/doctor`)
*   `POST /set-availability` `[Secured]`: Establishes shift timeline and break hours for a specific date, triggers automatic slot generation.
*   `GET /getAppointments` `[Secured]`: Retrieves all scheduled sessions for the authenticated doctor.
*   `GET /services` `[Secured]`: Lists the active catalog of services.
*   `PUT /services` `[Secured]`: Replaces the current service catalog with a new list of services (transactional operation).

### 👤 Patient-specific Routes (`/api/v1/patient`)
*   `GET /appointments` `[Secured]`: Lists all appointments booked by the patient.

### 📅 Appointment & Scheduling Routes (`/api/v1/appointment`)
*   `GET /verified-doctors` `[Secured]`: Returns all verified doctors with active availability, calculating dynamic counts and next available date.
*   `GET /doctor/:doctorId/slots` `[Secured]`: Fetches a doctor's active catalog and available slots from the current time forward (timezone offset aligned).
*   `POST /hold` `[Secured]`: Locks a slot for a pending transaction. Default hold duration is 10 minutes.
*   `POST /create-order` `[Secured]`: Initiates a new Razorpay order based on the required billing amount.
*   `POST /confirm-booking` `[Secured]`: Confirms payment signature and creates the booking. Executes inside a MongoDB transaction session.

---

## Key Architectural Workflows

### 1. Authentication & JWT Middleware
Request verification is handled by the `verifyJWT` middleware in [auth.middleware.js](file:///d:/medi_connect/medi_connect/backend/middlewares/auth.middleware.js). It reads tokens from incoming request cookies (`accessToken`) or the `Authorization` header (`Bearer token`). If valid, the user's data (sans sensitive passwords or refresh keys) is appended to `req.user` to proceed.

```
Request ──> [JWT Middleware] ──(Verify Secret)──> [Role Check] ──> Controller
```

### 2. Slot Generation Engine
Implemented in [slotGenerator.js](file:///d:/medi_connect/medi_connect/backend/utils/slotGenerator.js), the slot generator handles split break intervals and overnight work shifts.
- It translates "HH:mm" time ranges into linear integer minutes.
- Breaks are mapped and shifted linearly (e.g. shifts crossing midnight are computed sequentially by appending `+1440` minutes to the second-day intervals).
- Generated slots are cleaned up first using `deleteMany` and then recreated and inserted via `insertMany` in bulk.

```
Shift Hours (e.g., 22:00 - 06:00) ──> Split into 15m Blocks ──> Filter out Breaks ──> Insert Slots to DB
```

### 3. Appointment Booking & Payment Transaction Flow
To guarantee no two patients can successfully book or pay for the same slot, MediConnect uses a multi-tier reservation mechanism:
1. **Slot Lock**: The patient holds the slot (state changes from `available` to `locked` for a configurable timeout of 10 minutes).
2. **Order Placement**: An order is created on Razorpay for verification.
3. **Execution Transaction**: In [confirmPaymentAndBookAppointment](file:///d:/medi_connect/medi_connect/backend/controllers/appointment.controllers.js#L323-L542), the backend starts a Mongoose Transaction.
   - It performs a atomic find-and-update to change the slot state from `locked` (owned by the patient and not expired) to `booked`.
   - Calculates dynamic duration and fees of services chosen by the user.
   - Saves the new **Appointment** and **Payment** records inside the active transaction session.
   - If any step fails or the lock expired in the interim, the transaction rolls back safely.

---

## Installation & Local Setup

### Prerequisites
- Node.js installed (v18+ recommended)
- MongoDB running locally or a MongoDB Atlas connection string
- Razorpay developer account (for mock or test integration keys)

### Step-by-step Execution

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Setup environment variables:
   Create a `.env` file in the `backend` folder and populate it according to the [Environment Variables Reference](#environment-variables-reference) section.

4. Start the server in development mode:
   ```bash
   npm run dev
   ```
   The backend should report:
   ```text
   Mongo URI: mongodb://...
   MongoDB connected: localhost
   ⚙️ Server is running at port : 8000
   ```
