import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>ORBIT MARKET // UESC TELEMETRY OS</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: marathonWebStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const marathonWebStyles = `
body {
  background-color: #060608;
  color: #F2F0E8;
  caret-color: #C8FF00;
}
::selection {
  background-color: #C8FF00;
  color: #060608;
}
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #060608;
}
::-webkit-scrollbar-thumb {
  background: #222530;
}
::-webkit-scrollbar-thumb:hover {
  background: #C8FF00;
}
`;
