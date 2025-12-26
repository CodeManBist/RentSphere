const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const availabilitySchema = new Schema({
  listing: { 
    type: Schema.Types.ObjectId, 
    ref: 'Listing', 
    required: true,
    index: true 
  },
  date: { 
    type: Date, 
    required: true,
    index: true 
  },
  available: { 
    type: Boolean, 
    default: true 
  },
  price: Number, // For dynamic pricing later
  // Temporary holds for pending bookings
  heldUntil: Date,
  heldBy: { type: Schema.Types.ObjectId, ref: 'Booking' }
}, {
  timestamps: true
});

// Compound index for fast availability checks
availabilitySchema.index({ listing: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);
