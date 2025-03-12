const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/User");
const Resource = require("../models/Resource");
const Reservation = require("../models/Reservation");
const authenticateToken = require("../middleware/authenticateToken");
require("dotenv").config();

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Application context for the chatbot
const APP_CONTEXT = `
You are NaviSpace Assistant, an AI helper for our Resource Management System. You should be friendly and conversational.

Key Capabilities:
1. Resource Booking:
   - Handle various ways users might request bookings like:
     * "book/reserve/get me a desk"
     * "I need a meeting room"
     * "can I get a parking spot"
   - Ask for missing information like time or duration
   - Suggest alternatives if requested resource is unavailable

2. Navigation:
   - Handle location requests like:
     * "where is [person/place]"
     * "take me to [location]"
     * "how do I get to [resource]"
     * "find [person/place]"
   - Provide clear directions
   - Mention floor and building information

3. General Help:
   - Answer questions about available features
   - Provide guidance on using the system
   - Explain booking policies and rules

IMPORTANT BEHAVIOR RULES:
1. Be conversational and friendly
2. If user's request is unclear, ask for clarification
3. If missing important details (like time for booking), ask follow-up questions
4. Recognize synonyms (e.g., "book" = "reserve" = "get")
5. Always confirm understanding before taking action
6. Provide helpful suggestions when appropriate

Example Interactions:
User: "I need a desk"
Assistant: "I can help you book a desk! When would you like to reserve it for?"

User: "Where's John?"
Assistant: "Let me help you locate John. I'll check if they're currently using any resources."

User: "Book meeting room"
Assistant: "I'll help you reserve a meeting room. Could you tell me what time you need it for?"
`;

// Helper function to parse time string into Date object
function parseTime(timeStr, baseDate = new Date()) {
  // Support various time formats
  const timeFormats = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,                    // 3:30pm
    /(\d{1,2})\s*(am|pm)/i,                            // 3pm
    /(\d{1,2}):(\d{2})/,                               // 15:30
    /(\d{1,2})\s*o'?clock\s*(am|pm)?/i,               // 3 o'clock pm
    /(\d{1,2})\s*in\s*the\s*(morning|afternoon|evening)/i  // 3 in the afternoon
  ];

  for (const regex of timeFormats) {
    const match = timeStr.match(regex);
    if (match) {
      let hours = parseInt(match[1]);
      let minutes = match[2] && !isNaN(match[2]) ? parseInt(match[2]) : 0;
      
      // Handle meridian (AM/PM)
      const meridian = match[match.length - 1]?.toLowerCase();
      if (meridian) {
        if (meridian === 'pm' || meridian === 'afternoon' || meridian === 'evening') {
          if (hours < 12) hours += 12;
        } else if (meridian === 'am' || meridian === 'morning') {
          if (hours === 12) hours = 0;
        }
      }
      
      const result = new Date(baseDate);
      result.setHours(hours, minutes, 0, 0);
      return result;
    }
  }
  
  return null;
}

// Helper function to extract reservation intent and details
function extractReservationIntent(message) {
  // Match various booking-related phrases
  console.log(message);
  const bookingKeywords = /(?:book|reserve|get|need|want)\s+(?:a|an|the)?\s*([^for\s]+(?:\s+room)?)/i;
const timePattern = /(?:from|at|for|between)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|o'clock|in\s+the\s+(?:morning|afternoon|evening))?)(?:\s*(?:to|until|till|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|o'clock|in\s+the\s+(?:morning|afternoon|evening))?))?/gi;
  const bookingMatch = message.match(bookingKeywords);
  const timeMatch = message.match(timePattern);
  console.log(timeMatch);
  if (!bookingMatch) return null;

  const resourceName = bookingMatch[1].toLowerCase();
  let startTime = null;
  let endTime = null;

  if (timeMatch) {
    startTime = parseTime(timeMatch[1]);
    endTime = timeMatch[2] ? parseTime(timeMatch[2]) : null;
    
    // If only start time provided, assume 1-hour duration
    if (startTime && !endTime) {
      endTime = new Date(startTime.getTime() + 60 * 60000);
    }
  }

  return {
    resourceName,
    startTime,
    endTime,
    needsTimeInfo: !startTime || !endTime
  };
}

// Helper function to extract navigation intent
function extractNavigationIntent(message) {
  const navigationPatterns = [
    /(?:where(?:'s|is)|find|locate|take\s+me\s+to|navigate\s+to|show\s+me|get\s+(?:me\s+)?to)\s+(.+)/i,
    /(?:how\s+do\s+I\s+(?:get|go)\s+to)\s+(.+)/i,
    /(?:directions?\s+to)\s+(.+)/i
  ];

  for (const pattern of navigationPatterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        target: match[1].trim(),
        type: 'navigation'
      };
    }
  }

  return null;
}

// Helper function to handle resource reservation
async function handleReservation(userId, details) {
  try {
    // If missing time information, ask for it
    if (details.needsTimeInfo) {
      return {
        type: 'clarification',
        message: `I can help you book ${details.resourceName}. What time would you like to reserve it for?`
      };
    }

    // Find the resource
    const resource = await Resource.findOne({
      name: { $regex: new RegExp(details.resourceName, 'i') }
    });
    
    if (!resource) {
      return {
        type: 'error',
        message: `I couldn't find a resource named "${details.resourceName}". Could you please check the name or try a different resource?`
      };
    }
    
    // Check availability
    const existingReservation = await Reservation.findOne({
      resource_id: resource._id,
      start_time: { $lte: details.endTime },
      end_time: { $gte: details.startTime }
    });
    
    if (existingReservation) {
      // Find alternative times
      const alternativeTimes = await findAlternativeTimes(resource._id, details.startTime);
      return {
        type: 'unavailable',
        message: `Sorry, ${resource.name} is already reserved for that time. ${
          alternativeTimes.length > 0 
            ? `\n\nHere are some available time slots:\n${alternativeTimes.map(time => 
                `- ${time.start.toLocaleTimeString()} to ${time.end.toLocaleTimeString()}`
              ).join('\n')}`
            : ''
        }`
      };
    }
    
    // Create the reservation
    const newReservation = new Reservation({
      resource_id: resource._id,
      resource_type: resource.resource_type,
      participants: [userId],
      start_time: details.startTime,
      end_time: details.endTime
    });
    
    await newReservation.save();
    
    return {
      type: 'success',
      message: `Perfect! I've reserved ${resource.name} for you from ${details.startTime.toLocaleTimeString()} to ${details.endTime.toLocaleTimeString()}. You can find all your reservations in the "My Reservations" tab.`
    };
  } catch (error) {
    console.error('Reservation error:', error);
    return {
      type: 'error',
      message: "I encountered an error while trying to make the reservation. Please try again or contact support if the problem persists."
    };
  }
}

// Helper function to find alternative available times
async function findAlternativeTimes(resourceId, startTime) {
  const endOfDay = new Date(startTime);
  endOfDay.setHours(20, 0, 0, 0); // Assuming business hours end at 8 PM

  const reservations = await Reservation.find({
    resource_id: resourceId,
    start_time: { $gte: startTime },
    end_time: { $lte: endOfDay }
  }).sort('start_time');

  const availableTimes = [];
  let currentTime = new Date(startTime);

  for (const reservation of reservations) {
    if (currentTime < reservation.start_time) {
      availableTimes.push({
        start: currentTime,
        end: reservation.start_time
      });
    }
    currentTime = new Date(reservation.end_time);
  }

  if (currentTime < endOfDay) {
    availableTimes.push({
      start: currentTime,
      end: endOfDay
    });
  }

  return availableTimes.slice(0, 3); // Return top 3 alternatives
}

// Helper function to handle navigation requests
async function handleNavigation(target) {
  try {
    // First try to find a user
    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(target, 'i') } },
        { email_id: { $regex: new RegExp(target, 'i') } }
      ]
    });
    
    if (user) {
      return {
        type: 'user_location',
        message: `I can help you find ${user.username}. Head to the "Search Users" tab and enter their name. You'll see their current location and can use the "Navigate" button for directions.`
      };
    }
    
    // Try to find a resource
    const resource = await Resource.findOne({
      name: { $regex: new RegExp(target, 'i') }
    }).populate('floor_id');
    
    if (resource) {
      return {
        type: 'resource_location',
        message: `I found ${resource.name} on floor "${resource.floor_id.name}". Go to the "Available Resources" tab, locate the resource, and click the "Navigate" button. I'll show you the best path to get there.`
      };
    }
    
    return {
      type: 'not_found',
      message: `I couldn't find "${target}" in our system. Could you please verify the name or try describing what you're looking for differently?`
    };
  } catch (error) {
    console.error('Navigation error:', error);
    return {
      type: 'error',
      message: "I encountered an error while trying to find that location. Please try again or contact support if the problem persists."
    };
  }
}

// Helper function to get chatbot response
async function getChatbotResponse(message, userId) {
  try {
    // Check for reservation intent
    const reservationIntent = extractReservationIntent(message);
    if (reservationIntent) {
      const response = await handleReservation(userId, reservationIntent);
      return response.message;
    }
    
    // Check for navigation intent
    const navigationIntent = extractNavigationIntent(message);
    if (navigationIntent) {
      const response = await handleNavigation(navigationIntent.target);
      return response.message;
    }
    
    // For other queries, use Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `${APP_CONTEXT}

User Message: ${message}

Provide a helpful and friendly response that:
1. Shows you understand their request
2. Offers relevant guidance or information
3. Mentions specific features or sections of the application when appropriate
4. Asks for clarification if needed
5. Maintains a conversational tone

Remember to stay focused on NaviSpace's features and capabilities.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating response:", error);
    throw error;
  }
}

router.post("/",authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await getChatbotResponse(message, userId);
    
    if (!response) {
      throw new Error("No response generated");
    }

    res.json({ reply: response });
  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({ 
      error: "Failed to process chatbot response",
      details: error.message 
    });
  }
});

module.exports = router;