const User = require("../models/User");
const Reservation = require("../models/Reservation");
const {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
} = require("date-fns");

exports.getAttendanceAnalytics = async (req, res) => {
  try {
    const { start, end } = req.query; 
    const companyId = req.user.company_id;
    
    const startDate = start ? new Date(start) : new Date();
    const endDate = end ? new Date(end) : new Date();
    
    const users = await User.find({ company_id: companyId });
    
    const reservations = await Reservation.find({
      participants: { $in: users.map((user) => user._id) },
      $and: [{ start_time: { $gte: startDate } }, { end_time: { $lte: endDate } }],
    }).populate("participants", "username email_id");

    // Calculate attendance for each user, counting unique days only
    const attendance = users.map((user) => {
      const userReservations = reservations.filter((res) =>
        res.participants.some((p) => p._id.toString() === user._id.toString())
      );

      // Create a Set of unique dates (using date part only)
      const uniqueDates = new Set(
        userReservations.map((res) => format(new Date(res.start_time), "yyyy-MM-dd"))
      );

      return {
        userId: user._id,
        username: user.username,
        email: user.email_id,
        totalDays: uniqueDates.size, // Count of unique days
        reservations: userReservations.map((res) => ({
          date: format(new Date(res.start_time), "yyyy-MM-dd"),
          startTime: res.start_time,
          endTime: res.end_time,
          resourceType: res.resource_type,
        })),
      };
    });

    res.json({
      totalUsers: users.length,
      dateRange: {
        start: format(startDate, "yyyy-MM-dd"),
        end: format(endDate, "yyyy-MM-dd"),
      },
      attendance,
    });
  } catch (error) {
    console.error("Error getting attendance analytics:", error);
    res.status(500).json({ error: "Failed to get attendance analytics" });
  }
};

exports.getDailyAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const companyId = req.user.company_id;

    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Get all reservations for the day
    const reservations = await Reservation.find({
      participants: { $exists: true, $not: { $size: 0 } },
      start_time: { $lte: endOfDay },
      end_time: { $gte: startOfDay },
    }).populate("participants", "username email_id");

    // Calculate unique employees present
    const uniqueEmployees = new Set();
    reservations.forEach((res) => {
      res.participants.forEach((participant) => {
        uniqueEmployees.add(participant._id.toString());
      });
    });

    // Get total employee count for percentage calculation
    const totalEmployees = await User.countDocuments({ company_id: companyId });

    // Calculate attendance by hour
    const hourlyAttendance = Array(24).fill(0);
    reservations.forEach((res) => {
      const startHour = new Date(res.start_time).getHours();
      const endHour = new Date(res.end_time).getHours();
      for (let hour = startHour; hour <= endHour; hour++) {
        hourlyAttendance[hour] += res.participants.length;
      }
    });

    res.json({
      date: format(targetDate, "yyyy-MM-dd"),
      totalEmployees,
      presentEmployees: uniqueEmployees.size,
      attendancePercentage: (uniqueEmployees.size / totalEmployees) * 100,
      hourlyAttendance,
      reservations: reservations.map((res) => ({
        time: {
          start: res.start_time,
          end: res.end_time,
        },
        resourceType: res.resource_type,
        employees: res.participants.map((p) => ({
          id: p._id,
          username: p.username,
          email: p.email_id,
        })),
      })),
    });
  } catch (error) {
    console.error("Error getting daily attendance:", error);
    res.status(500).json({ error: "Failed to get daily attendance" });
  }
};

exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate user belongs to admin's company
    const user = await User.findOne({
      _id: userId,
      company_id: req.user.company_id,
    });

    if (!user) {
      return res
        .status(404)
        .json({ error: "User not found or not in your company" });
    }

    const start = startDate ? new Date(startDate) : startOfWeek(new Date());
    const end = endDate ? new Date(endDate) : endOfWeek(new Date());

    // Get all days in the range
    const allDays = eachDayOfInterval({ start, end });

    // Get user's reservations
    const reservations = await Reservation.find({
      participants: userId,
      start_time: { $gte: start },
      end_time: { $lte: end },
    }).sort("start_time");

    // Calculate weekly stats - count unique days only
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());
    const weeklyDates = new Set(
      reservations
        .filter(res => new Date(res.start_time) >= weekStart && new Date(res.end_time) <= weekEnd)
        .map(res => format(new Date(res.start_time), "yyyy-MM-dd"))
    );

    // Calculate monthly stats - count unique days only
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    const monthlyDates = new Set(
      reservations
        .filter(res => new Date(res.start_time) >= monthStart && new Date(res.end_time) <= monthEnd)
        .map(res => format(new Date(res.start_time), "yyyy-MM-dd"))
    );

    // Create attendance map
    const attendanceMap = allDays.map((day) => {
      const dayReservations = reservations.filter((res) => {
        const resDate = new Date(res.start_time);
        return format(resDate, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
      });

      return {
        date: format(day, "yyyy-MM-dd"),
        present: dayReservations.length > 0,
        reservations: dayReservations.map((res) => ({
          startTime: res.start_time,
          endTime: res.end_time,
          resourceType: res.resource_type,
        })),
      };
    });

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email_id,
      },
      stats: {
        weekly: {
          total: weeklyDates.size,
          dates: Array.from(weeklyDates),
        },
        monthly: {
          total: monthlyDates.size,
          dates: Array.from(monthlyDates),
        },
      },
      attendance: attendanceMap,
    });
  } catch (error) {
    console.error("Error getting employee attendance:", error);
    res.status(500).json({ error: "Failed to get employee attendance" });
  }
};