"use client";

import { useRef, useState } from "react";
import { PlusCircle, Send, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";

export default function PlanetChat() {
  const [messages, setMessages] = useState([
    {
      type: "user",
      content: "explain like im 5",
    },
    {
      type: "assistant",
      content:
        "Our own Large Language Model (LLM) is a type of AI that can learn from data. We have trained it on 7 billion parameters which makes it better than other LLMs. We are featured on aiplanet.com and work with leading enterprises to help them use AI securely and privately. We have a Generative AI Stack which helps reduce the hallucinations in LLMs and allows enterprises to use AI in their applications.",
    },
  ]);
  const [newMessage, setNewMessage] = useState("");
  const [currentPdf, setCurrentPdf] = useState("demo.pdf");

  const handleSendMessage = async () => {
    if (newMessage.trim()) {
      setMessages([...messages, { type: "user", content: newMessage }]);
      let question = newMessage;
      setNewMessage("");
      const response = await axios.post("http://127.0.0.1:8000/ask", {
        filename: currentPdf,
        question,
      });
      console.log(response);
      // In a real app, you would call an API here to get the AI response

      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          content: response.data.answer,
        },
      ]);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef?.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event?.target?.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log("Selected file:", file);
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(
        "http://127.0.0.1:8000/upload",
        formData
      );
      console.log("response", response);
      setCurrentPdf(file.name);
      // Add your file handling logic here
      // You might want to upload the file to a server or process it
    }
  };

  return (
    <div className="flex flex-col h-screen  border rounded-lg overflow-hidden shadow-lg">
      {/* Header with PDF controls */}
      <div className="flex items-center justify-between py-8 px-10 border-b bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
            <span className="text-2xl font-bold">P</span>
          </div>
          <span className="text-xl font-medium text-gray-700">planet</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <div className=" border-green-400 p-2 border-[0.0001px]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-400"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            {currentPdf}
          </div>
          <input
            type="file"
            accept=".pdf,application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <Button
            onClick={handleButtonClick}
            variant="outline"
            size="sm"
            className="  px-12 flex items-center "
          >
            <PlusCircle size={14} />
            <span>Upload PDF</span>
          </Button>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((message, index) => (
          <div key={index} className="mb-4 flex">
            {message.type === "user" ? (
              <>
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 mr-3 flex-shrink-0">
                  S
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%]">
                  <p className="text-gray-800">{message.content}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white mr-3 flex-shrink-0">
                  <span className="text-xs font-bold">P</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%]">
                  <p className="text-gray-800">{message.content}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Message input area */}
      <div className="p-3 border-t bg-white">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Send a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
            className="flex-1"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="text-gray-400 hover:text-gray-600"
          >
            <Send size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
}
