import { useState } from "react";
import type { ApiResponse } from "shared";

 
function Home() {
  const [data, setData] = useState<ApiResponse | undefined>();
 
  async function sendRequest() {
    try {
      // Use relative path - works in both dev and production
      const req = await fetch("/api/hello");
      const res: ApiResponse = await req.json();
      setData(res);
    } catch (error) {
      console.log(error);
    }
  }
 
  return (
    <>

      <h1>bhvr</h1>
      <h2>Bun + Hono + Vite + React</h2>
      <p>A typesafe fullstack monorepo</p>
      <div className='bg-red-700' >
        <button onClick={sendRequest}>Call API</button>
        {data && (
          <pre className='response'>
            <code>
              Message: {data.message} <br />
              Success: {data.success.toString()}
            </code>
          </pre>
        )}
      </div>
      <p className='read-the-docs'>Click the beaver to learn more</p>
    </>
  );
}
 
export default Home;