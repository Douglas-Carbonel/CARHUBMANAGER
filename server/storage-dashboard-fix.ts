import { db } from "./db";
import { sql } from "drizzle-orm";

// Fixed dashboard stats method that avoids SQL numeric conversion errors
export async function getFixedDashboardStats(technicianId?: number | null): Promise<{
  dailyRevenue: number;
  completedRevenue: number;
  predictedRevenue: number;
  dailyServices: number;
  appointments: number;
  activeCustomers: number;
}> {
  console.log("Getting fixed dashboard stats...", technicianId ? `for technician ${technicianId}` : "for admin");

  const today = new Date().toISOString().split('T')[0];
  console.log("Today date:", today);

  try {
    // Get all services without problematic SQL conversions
    const whereCondition = technicianId 
      ? sql`WHERE technician_id = ${technicianId}` 
      : sql`WHERE 1=1`;

    const allServicesResult = await db.execute(sql`
      SELECT 
        estimated_value, 
        final_value, 
        status, 
        scheduled_date,
        customer_id
      FROM services 
      ${whereCondition}
    `);

    console.log("Total services found:", allServicesResult.rows.length);

    // Helper function to safely parse numeric values
    const parseValue = (value: any): number => {
      if (value === null || value === undefined || value === '') return 0;
      const parsed = parseFloat(String(value));
      return isNaN(parsed) ? 0 : parsed;
    };

    let dailyRevenue = 0;
    let completedRevenue = 0;
    let predictedRevenue = 0;
    let dailyServices = 0;
    let appointments = 0;
    const uniqueCustomers = new Set();

    allServicesResult.rows.forEach((service: any) => {
      const estimatedValue = parseValue(service.estimated_value);
      const finalValue = parseValue(service.final_value);
      const serviceDate = service.scheduled_date;
      const status = service.status;

      // Add to unique customers set
      if (service.customer_id) {
        uniqueCustomers.add(service.customer_id);
      }

      // Calculate daily revenue (today's services)
      if (serviceDate === today && status !== 'cancelled') {
        dailyRevenue += estimatedValue;
        dailyServices++;
      }

      // Calculate completed revenue
      if (status === 'completed') {
        completedRevenue += finalValue > 0 ? finalValue : estimatedValue;
      }

      // Calculate predicted revenue (all non-cancelled)
      if (status !== 'cancelled') {
        predictedRevenue += estimatedValue;
      }

      // Count future appointments
      if (serviceDate > today && status === 'scheduled') {
        appointments++;
      }
    });

    const result = {
      dailyRevenue: Math.round(dailyRevenue * 100) / 100,
      completedRevenue: Math.round(completedRevenue * 100) / 100,
      predictedRevenue: Math.round(predictedRevenue * 100) / 100,
      dailyServices,
      appointments,
      activeCustomers: uniqueCustomers.size
    };

    console.log("Fixed dashboard stats result:", result);
    return result;

  } catch (error) {
    console.error('Error in getFixedDashboardStats:', error);
    return {
      dailyRevenue: 0,
      completedRevenue: 0,
      predictedRevenue: 0,
      dailyServices: 0,
      appointments: 0,
      activeCustomers: 0
    };
  }
}