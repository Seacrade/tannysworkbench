import React, { useState, useEffect } from "react";

export function AnimationControls({
  onPlay,
  onCapture,
  isRecording,
  onStartRecording,
  onStopRecording,
}) {
  const [initialState, setInitialState] = useState(() => {
    const saved = localStorage.getItem("currentInitialState");
    return saved
      ? JSON.parse(saved)
      : {
          phone: { x: 0, y: -2, z: 0 },
          camera: { x: 0, y: 0, z: 25 },
        };
  });

  const [steps, setSteps] = useState(() => {
    const saved = localStorage.getItem("currentSteps");
    return saved
      ? JSON.parse(saved)
      : [
          {
            phone: { x: 0, y: 0, z: 0 },
            camera: { x: 0, y: 0, z: 5 },
            duration: 1.5,
            ease: "power2.inOut",
          },
        ];
  });

  const [savedAnimations, setSavedAnimations] = useState([]);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("savedAnimations");
    if (saved) {
      setSavedAnimations(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("currentInitialState", JSON.stringify(initialState));
  }, [initialState]);

  useEffect(() => {
    localStorage.setItem("currentSteps", JSON.stringify(steps));
  }, [steps]);

  const saveAnimation = () => {
    if (!saveName.trim()) return;
    const newAnim = {
      name: saveName,
      initialState,
      steps,
    };
    const updated = [...savedAnimations, newAnim];
    setSavedAnimations(updated);
    localStorage.setItem("savedAnimations", JSON.stringify(updated));
    setSaveName("");
  };

  const loadForEditing = (anim) => {
    setInitialState(anim.initialState);
    setSteps(anim.steps);
  };

  const previewAnimation = (anim) => {
    onPlay({ initialState: anim.initialState, steps: anim.steps });
  };

  const deleteAnimation = (index) => {
    const updated = savedAnimations.filter((_, i) => i !== index);
    setSavedAnimations(updated);
    localStorage.setItem("savedAnimations", JSON.stringify(updated));
  };

  const roundInput = (val) => {
    const str = val.toString();
    if (str === "" || str === "-" || str === "+") return str;
    if (str.endsWith(".")) return str;

    const num = parseFloat(str);
    if (isNaN(num)) return str;

    if (str.includes(".")) {
      const parts = str.split(".");
      if (parts[1].length > 1) {
        return parseFloat(num.toFixed(1));
      }
    }
    return str;
  };

  const handleInitialChange = (entity, axis, value) => {
    setInitialState((prev) => ({
      ...prev,
      [entity]: {
        ...prev[entity],
        [axis]: roundInput(value),
      },
    }));
  };

  const handleStepChange = (index, entity, axis, value) => {
    setSteps((prev) => {
      const newSteps = [...prev];
      if (entity === "duration" || entity === "ease") {
        newSteps[index] = {
          ...newSteps[index],
          [entity]: entity === "duration" ? roundInput(value) : value,
        };
      } else {
        newSteps[index] = {
          ...newSteps[index],
          [entity]: {
            ...newSteps[index][entity],
            [axis]: roundInput(value),
          },
        };
      }
      return newSteps;
    });
  };

  const sanitizeValue = (val) => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
  };

  const handlePlay = () => {
    const sanitizedInitial = {
      phone: {
        x: sanitizeValue(initialState.phone.x),
        y: sanitizeValue(initialState.phone.y),
        z: sanitizeValue(initialState.phone.z),
      },
      camera: {
        x: sanitizeValue(initialState.camera.x),
        y: sanitizeValue(initialState.camera.y),
        z: sanitizeValue(initialState.camera.z),
      },
    };

    const sanitizedSteps = steps.map((step) => ({
      phone: {
        x: sanitizeValue(step.phone.x),
        y: sanitizeValue(step.phone.y),
        z: sanitizeValue(step.phone.z),
      },
      camera: {
        x: sanitizeValue(step.camera.x),
        y: sanitizeValue(step.camera.y),
        z: sanitizeValue(step.camera.z),
      },
      duration: sanitizeValue(step.duration) || 1.5,
      ease: step.ease,
    }));

    onPlay({ initialState: sanitizedInitial, steps: sanitizedSteps });
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        phone: { ...prev[prev.length - 1].phone },
        camera: { ...prev[prev.length - 1].camera },
        duration: 1.5,
        ease: "power2.inOut",
      },
    ]);
  };

  const addRandomStep = () => {
    const randomVal = () => parseFloat((Math.random() * 20 - 10).toFixed(1));
    setSteps((prev) => {
      const lastPhonePos = prev.length > 0 ? prev[prev.length - 1].phone : initialState.phone;
      return [
        ...prev,
        {
          phone: { ...lastPhonePos },
          camera: { x: randomVal(), y: randomVal(), z: randomVal() },
          duration: 1.5,
          ease: "power2.inOut",
        },
      ];
    });
  };

  const removeStep = (index) => {
    if (steps.length > 1) {
      setSteps((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const roundVal = (val) => parseFloat(Number(val).toFixed(1));

  const handleCapture = (index) => {
    const captured = onCapture();
    if (captured) {
      const roundedPhone = {
        x: roundVal(captured.phone.x),
        y: roundVal(captured.phone.y),
        z: roundVal(captured.phone.z),
      };
      const roundedCamera = {
        x: roundVal(captured.camera.x),
        y: roundVal(captured.camera.y),
        z: roundVal(captured.camera.z),
      };

      if (index === -1) {
        // Capture to Initial State
        setInitialState({
          phone: roundedPhone,
          camera: roundedCamera,
        });
      } else {
        // Capture to Step
        setSteps((prev) => {
          const newSteps = [...prev];
          newSteps[index] = {
            ...newSteps[index],
            phone: roundedPhone,
            camera: roundedCamera,
          };
          return newSteps;
        });
      }
    }
  };

  return (
    <div className="animation-controls">
      <h3>Animation Timeline</h3>

      <div className="section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4>Start Position</h4>
          <button
            onClick={() => handleCapture(-1)}
            style={{ width: "auto", marginTop: 0, padding: "2px 8px", fontSize: "0.8rem" }}>
            Current
          </button>
        </div>
        <div className="row">
          <span style={{ width: "60px" }}>Phone</span>
          <input
            type="number"
            value={initialState.phone.x}
            onChange={(e) => handleInitialChange("phone", "x", e.target.value)}
            placeholder="X"
          />
          <input
            type="number"
            value={initialState.phone.y}
            onChange={(e) => handleInitialChange("phone", "y", e.target.value)}
            placeholder="Y"
          />
          <input
            type="number"
            value={initialState.phone.z}
            onChange={(e) => handleInitialChange("phone", "z", e.target.value)}
            placeholder="Z"
          />
        </div>
        <div className="row">
          <span style={{ width: "60px" }}>Cam</span>
          <input
            type="number"
            value={initialState.camera.x}
            onChange={(e) => handleInitialChange("camera", "x", e.target.value)}
            placeholder="X"
          />
          <input
            type="number"
            value={initialState.camera.y}
            onChange={(e) => handleInitialChange("camera", "y", e.target.value)}
            placeholder="Y"
          />
          <input
            type="number"
            value={initialState.camera.z}
            onChange={(e) => handleInitialChange("camera", "z", e.target.value)}
            placeholder="Z"
          />
        </div>
      </div>

      <div style={{ maxHeight: "400px", overflowY: "auto", paddingRight: "5px" }}>
        {steps.map((step, index) => (
          <div key={index} className="section step-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h4>Step {index + 1}</h4>
              <div>
                <button
                  onClick={() => handleCapture(index)}
                  style={{
                    width: "auto",
                    marginTop: 0,
                    padding: "2px 8px",
                    fontSize: "0.8rem",
                    marginRight: "5px",
                  }}>
                  Current
                </button>
                {steps.length > 1 && (
                  <button
                    onClick={() => removeStep(index)}
                    style={{
                      width: "auto",
                      marginTop: 0,
                      padding: "2px 8px",
                      fontSize: "0.8rem",
                      background: "#d32f2f",
                    }}>
                    X
                  </button>
                )}
              </div>
            </div>

            <div className="row">
              <span style={{ width: "60px" }}>Phone</span>
              <input
                type="number"
                value={step.phone.x}
                onChange={(e) => handleStepChange(index, "phone", "x", e.target.value)}
                placeholder="X"
              />
              <input
                type="number"
                value={step.phone.y}
                onChange={(e) => handleStepChange(index, "phone", "y", e.target.value)}
                placeholder="Y"
              />
              <input
                type="number"
                value={step.phone.z}
                onChange={(e) => handleStepChange(index, "phone", "z", e.target.value)}
                placeholder="Z"
              />
            </div>

            <div className="row">
              <span style={{ width: "60px" }}>Cam</span>
              <input
                type="number"
                value={step.camera.x}
                onChange={(e) => handleStepChange(index, "camera", "x", e.target.value)}
                placeholder="X"
              />
              <input
                type="number"
                value={step.camera.y}
                onChange={(e) => handleStepChange(index, "camera", "y", e.target.value)}
                placeholder="Y"
              />
              <input
                type="number"
                value={step.camera.z}
                onChange={(e) => handleStepChange(index, "camera", "z", e.target.value)}
                placeholder="Z"
              />
            </div>

            <div className="row">
              <span>Duration</span>
              <input
                type="number"
                value={step.duration}
                onChange={(e) => handleStepChange(index, "duration", null, e.target.value)}
                step="0.1"
              />
            </div>
            <div className="row">
              <span>Ease</span>
              <select
                value={step.ease}
                onChange={(e) => handleStepChange(index, "ease", null, e.target.value)}>
                <option value="power1.in">Power1 In</option>
                <option value="power1.out">Power1 Out</option>
                <option value="power1.inOut">Power1 InOut</option>
                <option value="power2.in">Power2 In</option>
                <option value="power2.out">Power2 Out</option>
                <option value="power2.inOut">Power2 InOut</option>
                <option value="power3.in">Power3 In</option>
                <option value="power3.out">Power3 Out</option>
                <option value="power3.inOut">Power3 InOut</option>
                <option value="elastic.out">Elastic Out</option>
                <option value="bounce.out">Bounce Out</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <button onClick={addStep} style={{ background: "#444", flex: 1 }}>
          + Add Step
        </button>
        <button onClick={addRandomStep} style={{ background: "#444", flex: 1 }}>
          + Random Step
        </button>
      </div>

      <button onClick={handlePlay}>Play Animation Sequence</button>

      <button
        onClick={isRecording ? onStopRecording : onStartRecording}
        style={{
          marginTop: "10px",
          background: isRecording ? "#ef4444" : "var(--button-bg)",
          color: "#ffffff",
          border: "1px solid var(--border-color)",
        }}>
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      <div
        className="section"
        style={{
          marginTop: "20px",
          paddingTop: "20px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
        }}>
        <h4>Save Animation</h4>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <input
            type="text"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="Animation Name"
            style={{ flex: 1 }}
          />
          <button onClick={saveAnimation} style={{ width: "auto" }}>
            Save
          </button>
        </div>

        {savedAnimations.length > 0 && (
          <div>
            <h4>Saved Animations</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {savedAnimations.map((anim, index) => (
                <div key={index} className="saved-item">
                  <span
                    onClick={() => previewAnimation(anim)}
                    title="Click to Preview"
                    style={{ cursor: "pointer", flex: 1, textAlign: "left" }}>
                    {anim.name}
                  </span>
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button
                      onClick={() => loadForEditing(anim)}
                      style={{
                        width: "auto",
                        padding: "2px 6px",
                        fontSize: "0.8rem",
                        background: "#1976d2",
                      }}>
                      Edit
                    </button>
                    <button
                      onClick={() => deleteAnimation(index)}
                      style={{
                        width: "auto",
                        padding: "2px 6px",
                        fontSize: "0.8rem",
                        background: "#d32f2f",
                      }}>
                      X
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
