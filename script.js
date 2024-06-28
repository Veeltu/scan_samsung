const puppeteer = require('puppeteer');
const fs = require('fs').promises;

async function scanPage(url, apiUrl, expectedContent) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Enable request interception
    await page.setRequestInterception(true);

    let apiResponses = [];
    let modelLists = [];

    // Listen for API calls
    page.on('request', request => {
      if (request.url().includes(apiUrl)) {
        console.log(`API Call detected: ${request.method()} ${request.url()}`);
      }
      request.continue();
    });

    // Listen for API responses
    page.on('response', async response => {
      if (response.url().includes(apiUrl)) {
        try {
          const responseBody = await response.text();
          console.log('API response captured.');

          // Parse the response body
          const parsedResponse = JSON.parse(responseBody);

          // Add the response body to the array
          apiResponses.push(parsedResponse);

          // Check if the response contains the expected content
          if (responseBody.includes(expectedContent)) {
            console.log(`Expected content "${expectedContent}" found in response.`);
          } else {
            console.log(`Expected content "${expectedContent}" not found in response.`);
          }

          // Extract modelList if it exists
          if (parsedResponse.modelList) {
            modelLists.push(parsedResponse.modelList);
          }
        } catch (error) {
          console.error(`Error processing response from ${response.url()}:`, error);
        }
      }
    });

    // Navigate to the page
    console.log(`Navigating to ${url}...`);
    const response = await page.goto(url, { waitUntil: 'networkidle0' });

    // Check if the page is online
    if (response.ok()) {
      console.log('Page is online.');

      // Wait for a while to capture API calls
      console.log('Waiting for 10 seconds to capture API calls...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for 10 seconds

      if (apiResponses.length > 0) {
        // Save all API responses to a JSON file
        await fs.writeFile('api_responses.json', JSON.stringify(apiResponses, null, 2));
        console.log('API responses saved to api_responses.json');
      } else {
        console.log('No API responses were captured during the wait period.');
      }

      if (modelLists.length > 0) {
        // Save the extracted modelLists to a JSON file
        await fs.writeFile('model_lists.json', JSON.stringify(modelLists, null, 2));
        console.log('Model lists saved to model_lists.json');
      } else {
        console.log('No model lists were found in the API responses.');
      }
    } else {
      console.log(`Page is not accessible. Status: ${response.status()}`);
    }

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }
}

// Usage
const url = 'https://www.samsung.com/cz/offer/samsung-festival/';
const apiUrl = 'https://searchapi.samsung.com/v6/front/b2c/product/card/detail/newhybris';
const expectedContent = 'newhybris'; // Adjust this based on what you're looking for in the API response
scanPage(url, apiUrl, expectedContent);