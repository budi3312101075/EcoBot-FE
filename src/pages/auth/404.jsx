import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import notFoundImage from "../../images/404.gif";

const NotFound = () => {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-white px-5 py-12">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-red-100/60 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-blue-100/60 blur-3xl" />
      <section className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        <div className="mb-6 w-full max-w-sm sm:max-w-md">
          <img
            src={notFoundImage}
            alt="Ilustrasi halaman tidak ditemukan"
            className="mx-auto h-auto w-full object-contain"
          />
        </div>

        <div className="mt-0 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <Link
            to="/"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-600 hover:shadow-xl hover:shadow-red-500/30 focus:outline-none focus:ring-4 focus:ring-red-200 sm:w-auto"
          >
            <Home size={18} />
            Back to Home
            <ArrowLeft
              size={16}
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
          </Link>
        </div>

        <p className="mt-12 text-xs text-slate-400">
          Lost in cyberspace? Let's get you back on track.
        </p>
      </section>
    </main>
  );
};

export default NotFound;
