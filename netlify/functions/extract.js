exports.handler = async (event) => {
  console.log('Function triggered at:', new Date().toISOString());
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { url } = JSON.parse(event.body || '{}');
    
    if (!url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'URL is required' })
      };
    }

    console.log('Extracting from URL:', url);

    // 简单的测试响应
    const info = {
      companyName: 'Test Company',
      description: 'Test Description',
      address: 'Test Address',
      email: 'test@example.com',
      phone: '123-456-7890',
      instagram: [],
      facebook: []
    };

    console.log('Extraction completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: url,
        results: info,
        feishuSuccess: false
      })
    };

  } catch (error) {
    console.error('Error in function:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
