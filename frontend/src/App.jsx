import React, { useEffect, useState } from "react";

const BASE_URL = "http://127.0.0.1:8000/api/v1";

const App = () => {
  const doctorId = "69bac6e8646e5dce9f4740fc"; // 🔥 change dynamically later

  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // =========================
  // 🔐 AUTH TOKEN
  // =========================
 const getAccessToken = () =>
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OWMwMWExMGUwODViNmMxM2YyYWVmMjAiLCJlbWFpbCI6ImFudWpsb2xhbTEwQGdtYWlsLmNvbSIsInJvbGUiOiJwYXRpZW50IiwiaWF0IjoxNzc0MjA4MjAwLCJleHAiOjE3NzQyOTQ2MDB9.eJ2UoEVo-4J3noaweo4pkmDCZFwKBkurWW737mwsEGw";

const getAuthHeaders = () => {
  const token = getAccessToken();
  return { Authorization: `Bearer ${token}` };
};

  // =========================
  // 🔍 RESPONSE HANDLER
  // =========================
  const parseApiResponse = async (res) => {
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await res.json() : await res.text();

    if (!res.ok) {
      const message = isJson
        ? payload?.message || `Error ${res.status}`
        : `Error ${res.status}`;
      throw new Error(message);
    }

    return payload;
  };

  // =========================
  // 📡 FETCH DATA
  // =========================
  useEffect(() => {
    const fetchData = async () => {
      try {
        setErrorMessage("");

        const res = await fetch(
          `${BASE_URL}/appointment/doctor/${doctorId}/slots`,
          {
            headers: {
              ...getAuthHeaders(),
            },
            credentials: "include",
          }
        );

        const data = await parseApiResponse(res);

        setServices(data?.data?.services || []);
        setSlots(data?.data?.slots || []);
      } catch (err) {
        setServices([]);
        setSlots([]);
        setErrorMessage(
          err.message || "Failed to fetch services and slots"
        );
        console.error(err);
      }
    };

    fetchData();
  }, []);

  // =========================
  // 🧾 SERVICE SELECTION
  // =========================
  const toggleService = (serviceId) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const total = services
    .filter((s) => selectedServices.includes(s._id))
    .reduce((sum, s) => sum + s.price, 0);

  // =========================
  // 💳 LOAD RAZORPAY
  // =========================
  const loadRazorpay = () =>
    new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  // =========================
  // 💰 HANDLE PAYMENT
  // =========================
  const handlePayment = async () => {
    if (!selectedSlot) return alert("Select a slot");
    if (selectedServices.length === 0)
      return alert("Select at least one service");

    setLoading(true);

    try {
      // Create order
      const orderRes = await fetch(
        `${BASE_URL}/appointment/create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({ amount: total }),
        }
      );

      const orderData = await parseApiResponse(orderRes);

      const isLoaded = await loadRazorpay();
      if (!isLoaded) return alert("Razorpay failed to load");

      const options = {
        key: "rzp_test_SSjdPpx8CEdyxw", // 🔥 replace with your key
        amount: orderData.data.amount,
        currency: "INR",
        name: "MediConnect",
        description: "Doctor Appointment",
        order_id: orderData.data.id,
        handler: async (response) => {
          await confirmBooking(response);
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", () => {
        alert("Payment failed");
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      alert(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // ✅ CONFIRM BOOKING
  // =========================
  const confirmBooking = async (paymentResponse) => {
    try {
      const res = await fetch(
        `${BASE_URL}/appointment/confirm-booking`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({
            slotId: selectedSlot,
            serviceIds: selectedServices,
            amount: total,
            razorpayOrderId: paymentResponse.razorpay_order_id,
            razorpayPaymentId: paymentResponse.razorpay_payment_id,
            razorpaySignature: paymentResponse.razorpay_signature,
            paymentMethod: "card",
          }),
        }
      );

      const data = await parseApiResponse(res);

      alert(data?.message || "Appointment booked successfully!");
    } catch (err) {
      console.error(err);
      alert(err.message || "Booking failed");
    }
  };

  // =========================
  // 🎨 UI
  // =========================
  return (
    <div style={{ padding: "20px" }}>
      <h2>Book Appointment</h2>

      {errorMessage && (
        <p style={{ color: "red" }}>{errorMessage}</p>
      )}

      {/* SERVICES */}
      <h3>Select Services</h3>
      {services.length === 0 && <p>No services available</p>}
      {services.map((service) => (
        <div key={service._id}>
          <label>
            <input
              type="checkbox"
              onChange={() => toggleService(service._id)}
            />
            {service.name} - ₹{service.price}
          </label>
        </div>
      ))}

      {/* SLOTS */}
      <h3>Select Slot</h3>
      {slots.length === 0 && <p>No slots available</p>}
      {slots.map((slot) => (
        <button
          key={slot._id}
          onClick={() => setSelectedSlot(slot._id)}
          style={{
            display: "block",
            margin: "5px 0",
            background:
              selectedSlot === slot._id ? "lightgreen" : "white",
          }}
        >
          {new Date(slot.startDateTime).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}
        </button>
      ))}

      {/* TOTAL */}
      <h3>Total: ₹{total}</h3>

      {/* PAYMENT */}
      <button onClick={handlePayment} disabled={loading}>
        {loading ? "Processing..." : "Pay & Book"}
      </button>
    </div>
  );
};

export default App;