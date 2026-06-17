const https = require('https');
const http = require('http');

const API_URL = 'https://api.bwanabet.co.zm/api/v2/multi';

function query(graphql, label) {
  return new Promise((resolve) => {
    const body = JSON.stringify([{
      module: 'graphs',
      method: 'makeQuery',
      options: { query: graphql }
    }]);

    const url = new URL(API_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://bwanabet.co.zm',
        'Referer': 'https://bwanabet.co.zm/',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`QUERY: ${label}`);
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`${'='.repeat(60)}`);
        try {
          const parsed = JSON.parse(data);
          console.log(JSON.stringify(parsed, null, 2).slice(0, 3000));
          if (JSON.stringify(parsed).length > 3000) console.log('\n... (truncated, full response is longer)');
        } catch (e) {
          console.log('RAW:', data.slice(0, 2000));
        }
        resolve();
      });
    });

    req.on('error', (e) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`QUERY: ${label} — ERROR: ${e.message}`);
      resolve();
    });

    req.write(body);
    req.end();
  });
}

async function discover() {
  console.log('BwanaBet API Discovery');
  console.log(`Endpoint: ${API_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // 1. GraphQL Introspection — discover the full schema
  await query(`{
    __schema {
      queryType { name }
      types {
        name
        kind
        fields {
          name
          type { name kind ofType { name kind } }
        }
      }
    }
  }`, 'Full Schema Introspection');

  // 2. Simpler introspection — just query type fields
  await query(`{
    __type(name: "Query") {
      fields {
        name
        type { name kind ofType { name kind } }
        args { name type { name } }
      }
    }
  }`, 'Query Type Fields');

  // 3. Try common sports betting query patterns
  await query(`{ sports { id name slug } }`, 'Sports List');

  await query(`{ sport(slug: "football") { id name categories { id name slug } } }`, 'Football Categories');

  await query(`{ sports { id name leagues { id name } } }`, 'Sports with Leagues');

  await query(`{ events(sport: "football", status: "upcoming", limit: 5) { id name startTime homeTeam { name } awayTeam { name } odds { market outcomes { name odds } } } }`, 'Upcoming Football Events');

  await query(`{ matches(limit: 5) { id name startTime status } }`, 'Matches List');

  await query(`{ prematch(sportId: 1, limit: 5) { id name startTime } }`, 'Prematch Events');

  await query(`{ getSportEvents(sportSlug: "football", limit: 5) { id name startDate } }`, 'getSportEvents');

  await query(`{ getUpcoming(sport: "soccer", limit: 5) { id teams startTime markets { name selections { name price } } } }`, 'getUpcoming Soccer');

  // 4. Try without nesting - flat queries
  await query(`{ football { events { id name } } }`, 'Football Events Direct');

  await query(`{ live { events { id name sport } } }`, 'Live Events');

  await query(`{ upcoming { id name startTime sport { name } league { name } } }`, 'Upcoming Direct');

  // 5. Try enum/config queries
  await query(`{ config { sports { id name } } }`, 'Config Sports');

  await query(`{ menu { sports { id name slug count } } }`, 'Menu Sports');

  console.log(`\n${'='.repeat(60)}`);
  console.log('DISCOVERY COMPLETE');
  console.log('Share this output and I will build the integration.');
  console.log(`${'='.repeat(60)}`);
}

discover().catch(err => {
  console.error('Discovery failed:', err);
});
