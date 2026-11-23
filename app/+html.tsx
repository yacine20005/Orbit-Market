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
        <title>Orbit Market</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: marathonWebStyles }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const marathonWebStyles = `
body {
  background-color: #090A0F;
  color: #F4F2EA;
  caret-color: #C8FF00;
}
::selection {
  background-color: #C8FF00;
  color: #090A0F;
}
:focus-visible {
  outline: 2px solid #C8FF00;
  outline-offset: 2px;
}
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #090A0F;
}
::-webkit-scrollbar-thumb {
  background: #242836;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3D4459;
}
`;
