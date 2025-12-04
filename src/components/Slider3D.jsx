import React, { useState, useEffect, useRef } from "react";
import "./Slider3D.css";

export function Slider3D({ onBack }) {
  const baseUrl = import.meta.env.BASE_URL;
  const [showButton, setShowButton] = useState(true);
  const timerRef = useRef(null);

  const resetTimer = () => {
    setShowButton(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowButton(false);
    }, 3000);
  };

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className="slider3d-wrapper"
      onMouseMove={resetTimer}
      onTouchStart={resetTimer}
      onClick={resetTimer}
      style={{ "--bg-image": `url(${baseUrl}images/slider3d/tattoony/blackroom.jpg)` }}>
      <button className={`slider3d-back-btn ${showButton ? "" : "hidden"}`} onClick={onBack}>
        Back to 3D View
      </button>
      <div className="banner">
        <div className="slider" style={{ "--quantity": 10 }}>
          <div className="item" style={{ "--position": 1 }}>
            <img src={`${baseUrl}images/slider3d/tattoony/1.jpg`} alt="" />
          </div>
          <div className="item" style={{ "--position": 2 }}>
            <img src={`${baseUrl}images/slider3d/tattoony/2.jpg`} alt="" />
          </div>
          <div className="item" style={{ "--position": 3 }}>
            <img src={`${baseUrl}images/slider3d/tattoony/3.jpg`} alt="" />
          </div>
          <div className="item" style={{ "--position": 4 }}>
            <img src={`${baseUrl}images/slider3d/tattoony/4.jpg`} alt="" />
          </div>
          <div className="item" style={{ "--position": 5 }}>
            <img src={`${baseUrl}images/slider3d/tattoony/5.jpg`} alt="" />
          </div>
          <div className="item" style={{ "--position": 6 }}>
            <img src={`${baseUrl}images/slider3d/tattoony/6.jpg`} alt="" />
          </div>
          <div className="item" style={{ "--position": 7 }}>
            <img src={`${baseUrl}images/slider3d/tattoony/7.jpg`} alt="" />
          </div>
          <div className="item" style={{ "--position": 8 }}>
            <img src={`${baseUrl}images/slider3d/tattoony/8.jpg`} alt="" />
          </div>
          <div className="item" style={{ "--position": 9 }}>
            <img src={`${baseUrl}images/slider3d/tattoony/9.jpg`} alt="" />
          </div>
          <div className="item" style={{ "--position": 10 }}>
            <img src={`${baseUrl}images/slider3d/tattoony/10.jpg`} alt="" />
          </div>
        </div>
        <div className="content">
          <div className="model"></div>
        </div>
      </div>
    </div>
  );
}
