
const API_BASE = 'https://api.microlink.io/';

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'URL is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Construct the Microlink API URL
    const microlinkUrl = `${API_BASE}?url=${encodeURIComponent(targetUrl)}&screenshot=true&meta=false&fullPage=true&waitFor=3000&animations=true&hide=cookie-banner,.modal,.popup,.overlay,.ad-container,#ad-slot&viewport.width=1920&viewport.deviceScaleFactor=2`;

    // Fetch the screenshot from Microlink
    const response = await fetch(microlinkUrl, {
        headers: {
            'x-api-key': context.env.MICROLINK_API_KEY // If you have an API key
        }
    });
    
    const data = await response.json();

    if (data.status === 'success' && data.data.screenshot) {
      // Respond with the screenshot URL
      return new Response(JSON.stringify({ screenshotUrl: data.data.screenshot.url }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Forward the error from Microlink
      return new Response(JSON.stringify({ error: data.message || 'Failed to capture screenshot' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
