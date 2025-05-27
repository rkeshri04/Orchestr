# Orchestr

## AI-Powered Conflict-Free Group Scheduling

---

## Overview

**IntelliSchedule** is an innovative web application designed to eliminate the stress and manual effort of coordinating group activities. Leveraging advanced AI, it intelligently finds, suggests, and books the best times for any group — be it your family, social circle, or small team. Say goodbye to endless back-and-forth messages; simply ask the AI, and it handles the rest.

---

## Features (MVP)

* **Natural Language AI Scheduling:** Simply type your scheduling needs in plain English (e.g., "What time is everyone free for dinner on Monday?", "Schedule a 30-min meeting for the team next Tuesday morning"). Our AI understands your intent and processes the request.
* **Conflict Resolution:** The AI automatically checks all linked calendars for relevant group members, identifies conflicts, and proposes optimal available times.
* **Automated Event Creation:** Upon confirmation, the AI creates the event and adds it to the calendars of all participants.
* **Group Management:** Easily create and manage groups (e.g., "Family," "Book Club," "Project Team") and invite members.
* **User Accounts & Profiles:** Secure login and personalized profiles to manage your calendar connections and preferences.
* **Notifications:** Stay informed with in-app notifications and email reminders for upcoming events and scheduling updates.

---

## Running Locally

You can run Orchestr locally for development or personal use:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rkeshri04/orchestr.git
   cd orchestr
   ```

2. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables:**
   - Create a `.env` file and Copy `.env.example` to `.env` and fill in the required values (e.g., Supabase keys, API endpoints).

4. **Start the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser:**
   - Visit [http://localhost:3000](http://localhost:3000) to use the app locally.

---

## License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---