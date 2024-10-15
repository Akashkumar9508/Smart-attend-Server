const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    rollNumber: {
        type: Number,  
        required : true,
        unique : true,
    },
    status: {
        type: String,
        enum: ['present', 'absent'],
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);