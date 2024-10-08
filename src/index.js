console.log("running index.js")
import 'react-app-polyfill/stable';
import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./css/styles.css";
import "./css/sortabletable.css";

require("./util/custom_typings/extensions")

import FileUploadApp from "./FileUploadApp";
import { GoogleApiSignin } from './googlelogin';


// import { BrowserRouter, Route } from 'react-router-dom';
// function App() {
//   return (
//     <BrowserRouter>
//       <Route exact path="/" component={Main} />
//       <Route path="/about" component={Main} />
//       <Route path="/contact" component={Main} />
//     </BrowserRouter>
//   );
// }
// let app
// switch (window.location.pathname) {
//   case "/googlelogin": app = (<GoogleApiSignin />); break;
//   case "/": app = (<FileUploadApp />); break;
//   default: throw Error(`Path ${window.location.pathname} is invalid`)
// }

// handleRedirect().then(() =>{
//   const root = createRoot(document.getElementById("root"));
//   root.render(
//     <StrictMode>
//       <FileUploadApp />
//     </StrictMode>
//   );
// })



const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <GoogleApiSignin />
    <FileUploadApp />
  </StrictMode>
);