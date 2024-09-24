const express = require('express');
const app = express();
const mysql = require('mysql2');

// Middleware to parse JSON bodies
app.use(express.json());

let db;

function handleDisconnect() {
    db = mysql.createConnection({
        user: 'root',
        host: 'dev.cvwa2eocu5rr.ap-south-1.rds.amazonaws.com',
        password: 'Varanasi123#',
        database: 'dev'
    });

    db.connect((err) => {
        if (err) {
            console.log('Error connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // Try to reconnect after 2 seconds
        } else {
            console.log('Connected to database');
        }
    });

    db.on('error', (err) => {
        console.log('Database error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect(); // Reconnect on connection lost
        } else {
            throw err; // For other errors
        }
    });
}

handleDisconnect();

// Route to select all countries
app.get('/select', (req, res) => {
    const query = 'SELECT * from user_profile';
    
    db.query(query, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error occurred during the query.');
            return;
        }
        res.send(result);
    });
});

// Route to insert country using request body
app.post('/insert', (req, res) => {
    const { phone_number, first_name, last_name, secondary_number, primary_email, secondary_email, company, designation, company_start_date, company_end_date, profile_description, mac_id, linkedin_profile_link } = req.body; // Get countryName and population from request body

    // Check if both values are provided
    if (!phone_number || !first_name || !last_name || !secondary_number || !primary_email || !secondary_email || !company || !designation || !company_start_date || !company_end_date || !profile_description || !mac_id || !linkedin_profile_link) {
        return res.status(400).send('Some field is empty');
    }

    const query = 'INSERT INTO user_profile (phone_number, first_name, last_name, secondary_number, primary_email, secondary_email, company, designation, company_start_date, company_end_date, profile_description, mac_id, linkedin_profile_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const values = [phone_number, first_name, last_name, secondary_number, primary_email, secondary_email, company, designation, company_start_date, company_end_date, profile_description, mac_id, linkedin_profile_link];

    db.query(query, values, (err, result) => {
        if (err) {
            console.log(err);
            res.status(500).send('Error occurred during the query.');
            return;
        }

        res.send(result);
    });
});

// Send OTP endpoint
app.post('/send-otp', (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000); // Generate a 6-digit OTP

  // Insert phone number and OTP into the database, update OTP if phone number exists
  const otpquery = 'INSERT INTO authentication (phone_number, otp) VALUES (?, ?) ON DUPLICATE KEY UPDATE otp = ?';
  const otpvalues = [phoneNumber, otp, otp]; // Providing OTP for both insert and update

  db.query(otpquery, otpvalues, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database query error' });
    }

    // In production, you should not send the OTP back in the response
    res.json({ message: `OTP sent to ${phoneNumber}`, otp });

    // In development, you can include OTP in the response for testing purposes
    // res.json({ message: `OTP sent to ${phoneNumber}`, otp });
  });
});

  
  // Verify OTP endpoint
  app.post('/verify-otp', (req, res) => {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
        return res.status(400).json({ error: 'Phone number and OTP are required' });
    }

    // Query the database to verify the OTP
    const otpQuery = 'SELECT * FROM authentication WHERE phone_number = ? AND otp = ?';
    const otpValues = [phoneNumber, otp];

    db.query(otpQuery, otpValues, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Database query error' });
        }

        if (result.length > 0) {
            // OTP matches
            res.json({ message: 'OTP verified successfully, user authenticated' });

            // Delete the OTP entry
            const deleteQuery = 'DELETE FROM authentication WHERE phone_number = ?';
            db.query(deleteQuery, [phoneNumber], (err) => {
                if (err) {
                    console.error('Error deleting OTP:', err);
                }
            });
        } else {
            // OTP doesn't match
            res.status(400).json({ error: 'Invalid OTP or phone number' });
        }
    });
});


app.listen(3001, () => {
    console.log('Server Running');
});
