import { db } from "./db";
import { sql } from "drizzle-orm";

// Fixed dashboard stats method that avoids SQL numeric conversion errors
// Debug function to check database structure
async function debugDatabaseStructure() {
  try {
    // Check table structure
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'services'
      ORDER BY ordinal_position
    `);
    console.log("Services table structure:", tableInfo.rows);

    // Get some sample data
    const sampleData = await db.execute(sql`
      SELECT * FROM services ORDER BY id DESC LIMIT 3
    `);
    console.log("Sample services data:", sampleData.rows);

  } catch (error) {
    console.error("Error in debug function:", error);
  }
}

export async function getFixedDashboardStats(technicianId?: number | null): Promise<{
  dailyRevenue: number;
  completedRevenue: number;
  predictedRevenue: number;
  dailyServices: number;
  appointments: number;
  activeCustomers: number;
}> {
  console.log("Getting fixed dashboard stats...", technicianId ? `for technician ${technicianId}` : "for admin");

  // Run debug function to understand the data structure
  await debugDatabaseStructure();

  const today = new Date().toISOString().split('T')[0];
  console.log("Today date:", today);

  try {
    // First, let's check if there are any services at all
    const totalServicesResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM services
    `);
    console.log("Total services in database:", totalServicesResult.rows[0]);

    // Check if technician_id column exists and has data
    if (technicianId) {
      const technicianServicesCheck = await db.execute(sql`
        SELECT COUNT(*) as total FROM services WHERE technician_id = ${technicianId}
      `);
      console.log(`Services for technician ${technicianId}:`, technicianServicesCheck.rows[0]);
      
      // If no services found for technician, let's check if technician_id column has any data
      const technicianIdCheck = await db.execute(sql`
        SELECT COUNT(*) as with_technician FROM services WHERE technician_id IS NOT NULL
      `);
      console.log("Services with technician_id populated:", technicianIdCheck.rows[0]);
    }

    // For debugging, let's get all services first to see the structure
    const allServicesResult = await db.execute(sql`
      SELECT 
        id,
        estimated_value, 
        final_value, 
        status, 
        scheduled_date,
        customer_id,
        technician_id
      FROM services 
      ORDER BY id DESC
      LIMIT 10
    `);

    console.log("Sample services from database:", allServicesResult.rows);

    // Now get services with the actual filter
    const whereCondition = technicianId 
      ? sql`WHERE technician_id = ${technicianId}` 
      : sql`WHERE 1=1`;

    const filteredServicesResult = await db.execute(sql`
      SELECT 
        estimated_value, 
        final_value, 
        status, 
        scheduled_date,
        customer_id
      FROM services 
      ${whereCondition}
    `);

    console.log("Filtered services found:", filteredServicesResult.rows.length);

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

    filteredServicesResult.rows.forEach((service: any) => {
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