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
          target: { x: 0, y: 0, z: 0 },
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
            target: { x: 0, y: 0, z: 0 },
            duration: 1.5,
            delay: 0,
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
      if (entity === "duration" || entity === "delay" || entity === "ease") {
        newSteps[index] = {
          ...newSteps[index],
          [entity]: entity === "duration" || entity === "delay" ? roundInput(value) : value,
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
      target: {
        x: sanitizeValue(initialState.target?.x || 0),
        y: sanitizeValue(initialState.target?.y || 0),
        z: sanitizeValue(initialState.target?.z || 0),
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
      target: {
        x: sanitizeValue(step.target?.x || 0),
        y: sanitizeValue(step.target?.y || 0),
        z: sanitizeValue(step.target?.z || 0),
      },
      duration: sanitizeValue(step.duration) || 1.5,
      delay: sanitizeValue(step.delay) || 0,
      ease: step.ease,
    }));

    onPlay({ initialState: sanitizedInitial, steps: sanitizedSteps });
  };

  const addStep = () => {
    const captured = onCapture();
    setSteps((prev) => [
      ...prev,
      {
        phone: {
          x: roundVal(captured.phone.x),
          y: roundVal(captured.phone.y),
          z: roundVal(captured.phone.z),
        },
        camera: {
          x: roundVal(captured.camera.x),
          y: roundVal(captured.camera.y),
          z: roundVal(captured.camera.z),
        },
        target: {
          x: roundVal(captured.target.x),
          y: roundVal(captured.target.y),
          z: roundVal(captured.target.z),
        },
        duration: 1.5,
        delay: 0,
        ease: "power2.inOut",
      },
    ]);
  };

  const addRandomStep = () => {
    const randomVal = () => parseFloat((Math.random() * 20 - 10).toFixed(1));
    setSteps((prev) => {
      const lastPhonePos = prev.length > 0 ? prev[prev.length - 1].phone : initialState.phone;
      const lastTarget =
        prev.length > 0
          ? prev[prev.length - 1].target || { x: 0, y: 0, z: 0 }
          : initialState.target || { x: 0, y: 0, z: 0 };
      return [
        ...prev,
        {
          phone: { ...lastPhonePos },
          camera: { x: randomVal(), y: randomVal(), z: randomVal() },
          target: { ...lastTarget },
          duration: 1.5,
          delay: 0,
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
      const roundedTarget = {
        x: roundVal(captured.target.x),
        y: roundVal(captured.target.y),
        z: roundVal(captured.target.z),
      };

      if (index === -1) {
        // Capture to Initial State
        setInitialState({
          phone: roundedPhone,
          camera: roundedCamera,
          target: roundedTarget,
        });
      } else {
        // Capture to Step
        setSteps((prev) => {
          const newSteps = [...prev];
          newSteps[index] = {
            ...newSteps[index],
            phone: roundedPhone,
            camera: roundedCamera,
            target: roundedTarget,
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
            title="Capture current camera and target position"
            style={{ width: "auto", marginTop: 0, padding: "2px 8px", fontSize: "0.8rem" }}>
            Current
          </button>
        </div>
        <div className="row">
          <span style={{ width: "60px" }} title="Controls the position of the Camera">
            Cam
          </span>
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
        <div className="row">
          <span
            style={{ width: "60px" }}
            title="Controls where the Camera is looking (Focus Point)">
            Target
          </span>
          <input
            type="number"
            value={initialState.target?.x || 0}
            onChange={(e) => handleInitialChange("target", "x", e.target.value)}
            placeholder="X"
          />
          <input
            type="number"
            value={initialState.target?.y || 0}
            onChange={(e) => handleInitialChange("target", "y", e.target.value)}
            placeholder="Y"
          />
          <input
            type="number"
            value={initialState.target?.z || 0}
            onChange={(e) => handleInitialChange("target", "z", e.target.value)}
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
                  title="Capture current camera and target position"
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
              <span style={{ width: "60px" }} title="Controls the position of the Camera">
                Cam
              </span>
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
              <span
                style={{ width: "60px" }}
                title="Controls where the Camera is looking (Focus Point)">
                Target
              </span>
              <input
                type="number"
                value={step.target?.x || 0}
                onChange={(e) => handleStepChange(index, "target", "x", e.target.value)}
                placeholder="X"
              />
              <input
                type="number"
                value={step.target?.y || 0}
                onChange={(e) => handleStepChange(index, "target", "y", e.target.value)}
                placeholder="Y"
              />
              <input
                type="number"
                value={step.target?.z || 0}
                onChange={(e) => handleStepChange(index, "target", "z", e.target.value)}
                placeholder="Z"
              />
            </div>

            <div className="row">
              <span title="Duration of the animation in seconds">Duration</span>
              <input
                type="number"
                value={step.duration}
                onChange={(e) => handleStepChange(index, "duration", null, e.target.value)}
                step="0.1"
              />
              <span title="Delay before starting this step in seconds">Delay</span>
              <input
                type="number"
                value={step.delay}
                onChange={(e) => handleStepChange(index, "delay", null, e.target.value)}
                step="0.1"
              />
            </div>
            <div className="row">
              <span title="Easing function for the animation">Ease</span>
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
