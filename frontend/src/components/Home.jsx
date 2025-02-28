import React from 'react';

const backendUrl = `${import.meta.env.VITE_API_URL}`;

const Home = () => {
  const [protectedData, setProtectedData] = React.useState(null);

  React.useEffect(() => {
    const fetchProtectedData = async () => {
      try {
        const response = await fetch(`${backendUrl}auth/protected`, {
          method: "GET",
          credentials: "include", // 🔹 Include cookies in the request
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setProtectedData(data);
      } catch (error) {
        console.error("Error fetching protected data:", error);
      }
    };

    fetchProtectedData();
  }, []);

  return (
    <div>
      <h1>Welcome to Navispace!</h1>
      <p>This is the homepage.</p>
      {protectedData && <p>Protected Data: {JSON.stringify(protectedData)}</p>}
    </div>
  );
};

export default Home;
