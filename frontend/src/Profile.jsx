import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, MapPin, Save } from "lucide-react";
import "./Profile.css";

export default function Profile() {
  const [profile, setProfile] = useState({
    name: "Jaydeep",
    email: "jaydeep@example.com",
    phone: "+91 9876543210",
    location: "Bengaluru, India",
  });

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  return (
    <motion.div
      className="profile-container glass-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="profile-title">
        <User size={22} /> Profile Settings
      </h2>

      <div className="profile-grid">
        <div className="profile-field">
          <label>Name</label>
          <input
            type="text"
            name="name"
            value={profile.name}
            onChange={handleChange}
          />
        </div>

        <div className="profile-field">
          <label>Email</label>
          <div className="input-with-icon">
            <Mail size={18} />
            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="profile-field">
          <label>Phone</label>
          <div className="input-with-icon">
            <Phone size={18} />
            <input
              type="text"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="profile-field">
          <label>Location</label>
          <div className="input-with-icon">
            <MapPin size={18} />
            <input
              type="text"
              name="location"
              value={profile.location}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>

      <button className="save-btn">
        <Save size={18} /> Save Changes
      </button>
    </motion.div>
  );
}
