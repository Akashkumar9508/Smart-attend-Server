const express = require('express');
const mongoose = require('mongoose');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');
const { signup, login } = require('./controllers/authControllers');
const User = require('./models/user');
const Attendance = require('./models/attendance');
const Message = require('./models/message');
dotenv.config();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', function (req, res) {
    res.send('Server is running');
});
// POST - singup & Login
app.post('/signup', signup);
app.post('/login', login);

// GET - all students 
app.get('/students', async (req, res) => {
    try {
        const students = await User.find({ role: 'student' });

        if (!students) {
            return res.status(404).json({ message: 'No students found' });
        }

        const studentsWithAttendance = await Promise.all(
            students.map(async (student) => {
                const today = new Date();
                const startOfDay = new Date(today.setHours(0, 0, 0, 0));
                const attendanceRecord = await Attendance.findOne({
                    studentId: student._id,
                    createdAt: { $gte: startOfDay },
                });

                return {
                    _id: student._id,
                    name: student.name,
                    rollNumber: student.rollNumber,
                    email: student.email,
                    attendanceStatus: attendanceRecord ? attendanceRecord.status : 'Not Marked',
                };
            })
        );

        res.status(200).json(studentsWithAttendance);
    } catch (error) {
        console.error('Error fetching students with attendance:', error);
        res.status(500).json({ message: 'Error fetching students with attendance' });
    }
});

// POST - mark the attendance of the student 
app.post('/attendance', async (req, res) => {
    const { attendanceData } = req.body;

    if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
        return res.status(400).json({ message: 'Invalid input data' });
    }

    try {
        const attendanceRecords = [];
        const alreadyMarkedRollNumbers = [];

        for (let record of attendanceData) {
            const { rollNumber, status } = record;

            if (!rollNumber || !['present', 'absent'].includes(status)) {
                return res.status(400).json({ message: 'Invalid input for roll number or status' });
            }
            const student = await User.findOne({ rollNumber, role: 'student' });
            if (!student) {
                return res.status(404).json({ message: `Student with roll number ${rollNumber} not found` });
            }

            const existingAttendance = await Attendance.findOne({
                studentId: student._id,
                createdAt: { $gte: new Date().setHours(0, 0, 0, 0) },
            });

            if (existingAttendance) {
                alreadyMarkedRollNumbers.push(rollNumber);
            } else {
                const attendance = new Attendance({
                    studentId: student._id,
                    rollNumber,
                    status,
                });
                await attendance.save();
                attendanceRecords.push(attendance);
            }
        }

        if (alreadyMarkedRollNumbers.length > 0) {
            return res.status(400).json({
                message: 'Attendance already marked for some students',
                alreadyMarkedRollNumbers
            });
        }

        return res.status(201).json({ message: 'Attendance marked successfully', attendanceRecords });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error });
    }
});

// POST - Create a new message
app.post('/messages', async (req, res) => {
    const { teacherId, message, duration } = req.body;

    if (!message || !duration || !teacherId) {
        return res.status(400).json({ message: 'Message, teacher ID, and duration are required' });
    }

    try {
        const newMessage = new Message({
            teacherId,
            message,
            duration,
        });

        await newMessage.save();
        res.status(201).json({ message: 'Message created successfully', newMessage });
    } catch (error) {
        res.status(500).json({ message: 'Error creating message', error });
    }
});

// GET - Get messages for students (only active ones)
app.get('/messages', async (req, res) => {
    try {
        const currentTime = new Date();

        // Find messages where the startTime is in the past
        // and the current time is still within the duration period.
        const activeMessages = await Message.find({
            startTime: { $lte: currentTime }, // Ensure the message started before or at current time
            $expr: {
                $gt: [{ $add: ['$startTime', { $multiply: ['$duration', 60000] }] }, currentTime]
            } // Ensure the current time is still within the duration
        });

        if (activeMessages.length === 0) {
            return res.status(200).json({ message: 'No active messages' });
        }

        res.status(200).json(activeMessages);
    } catch (error) {
        console.error('Error fetching active messages:', error);
        res.status(500).json({ message: 'Error fetching messages', error });
    }``
});


mongoose
    .connect(process.env.MONGOOSE_URL)
    .then(() => {
        console.log("Connected to MongoDB successfully.");
        app.listen(process.env.PORT || 5000, (err) => {
            if (err) console.log(err);
            console.log(`Server running on port ${process.env.PORT || 5000}`);
        });
    })
    .catch((error) => console.log("Failed to connect", error));
