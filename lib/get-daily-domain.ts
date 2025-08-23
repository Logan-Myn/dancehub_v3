/**
 * Get the Daily.co domain associated with the API key
 */
export async function getDailyDomain(): Promise<string> {
  // First check if we have it in environment variable
  if (process.env.DAILY_DOMAIN) {
    return process.env.DAILY_DOMAIN;
  }

  const DAILY_API_KEY = process.env.DAILY_API_KEY;
  
  if (!DAILY_API_KEY) {
    // Return the known domain as fallback
    return 'kiora';
  }

  try {
    const response = await fetch('https://api.daily.co/v1/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.warn(`Failed to get Daily domain from API: ${response.status}`);
      return 'kiora'; // Use known domain as fallback
    }

    const data = await response.json();
    console.log('Daily.co domain retrieved:', data.domain_name);
    
    // Return the domain name (e.g., "kiora" from "kiora.daily.co")
    return data.domain_name || 'kiora';
  } catch (error) {
    console.error('Error fetching Daily domain:', error);
    // Fallback to the known domain
    return 'kiora';
  }
}