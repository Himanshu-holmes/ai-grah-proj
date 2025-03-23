"use client";

import { useEffect, useRef, useState } from "react";
import { PlusCircle, Send, SendHorizonal, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { toast } from "sonner";
import { Spinner } from "./ui/spinner";

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
  const [currentPdf, setCurrentPdf] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading,setIsUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const handleSendMessage = async () => {
    try {
      if (newMessage.trim()) {
        setMessages([...messages, { type: "user", content: newMessage }]);
        let question = newMessage;
        setNewMessage("");
        setIsLoading(true);
        const response = await axios.post(
          "http://127.0.0.1:8000/ask",
          {
            filename: currentPdf,
            question,
          },
          { withCredentials: true, maxRedirects: 4 }
        );

        if (response.status !== 200) {
          setIsLoading(false);

          toast.error(response.data.detail);
          return;
        }
        console.log(response);
        // In a real app, you would call an API here to get the AI response
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: response.data.answer,
          },
        ]);

      }
    } catch (error: any) {
      setIsLoading(false);

      console.log(error);
      if (error.response) {
        console.log("error response", error.response);
        toast.error(error.response?.data?.detail);
      } else {
        toast.error(error.message);
      }
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef?.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      setIsUploading(true)
      const files = event?.target?.files;
      if (files && files.length > 0) {
        const file = files[0];
        console.log("Selected file:", file);
        const formData = new FormData();
        formData.append("file", file);
        const response = await axios.post(
          "http://localhost:8000/upload",
          formData,
          {
            withCredentials: true,
            maxRedirects: 4,
          }
        );
        console.log("status", response.status);
        if (response.status !== 200) {
          setIsUploading(false)
          toast.error(response.data.detail);
          return
        }
        console.log("response", response);
        setCurrentPdf(file.name);
        setIsUploading(false)
        // Add your file handling logic here
        // You might want to upload the file to a server or process it
      }
    } catch (error: any) {
      setIsUploading(false)
      console.log(error);
      if (error.response) {
        console.log("error response", error.response);
        toast.error(error.response?.data?.detail);
      } else {
        toast.error(error.message);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen   mx-auto border rounded-lg  shadow-lg bg-gray-50 sm:px-10">
      {/* Header with PDF controls */}
      <div className="flex items-center justify-between py-4 px-10 border-b bg-white">
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
            <span className="text-xs font-bold">P</span>
          </div>
          <span className="text-xl  font-extrabold text-black">planet</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-green-400 border-green-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="35"
              height="35"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-green-400 border border-green-200 rounded-sm p-0.5"
            >
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            {currentPdf}
          </div>
          <input
            type="file"
            accept=".pdf,application/pdf"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
          <button
            onClick={handleButtonClick}
            className="border-1 border-gray-700 rounded py-2 flex items-center gap-2 justify-around px-2 sm:px-10"
          >{
            isUploading ? <Spinner size={"small"}/> :<>
            
            <PlusCircle size={20} strokeWidth={1.25} />
            <span className="hidden sm:block font-semibold">Upload PDF</span>
            </>
          }
          </button>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto  bg-gray-50 py-16 px-7 sm:p-16 ">
        {messages.map((message, index) => (
          <div key={index} className="mb-20 flex">
            {message.type === "user" ? (
              <>
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 mr-3 flex-shrink-0">
                  S
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%]">
                  <p className="text-gray-900">{message.content}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white mr-3 flex-shrink-0">
                  <span className="text-xs font-bold">P</span>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm max-w-[80%]">
                  <p className="text-gray-900 font-semibold">
                    {message.content}
                  </p>
                </div>
              </>
            )}
          </div>
        ))}
        {/* Loading indicator */}
        {isLoading && (
          <div className="mb-4 flex">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white mr-3 flex-shrink-0">
              <span className="text-xs font-bold">P</span>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm max-w-[80%] flex items-center">
              <div className="flex space-x-2">
                <div
                  className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef}></div>
      </div>

      {/* Message input area */}
      <div className="sm:p-6 sm:px-20  bg-white mb-10">
        <div className="relative flex items-center gap-2 ">
          <Input
            type="text"
            placeholder="Send a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
            className="flex-1 p-6"
          />
          <Button
            variant="ghost"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="text-gray-400 hover:text-gray-600 absolute right-0"
          >
            <SendHorizonal size={50} className="text-gray-600  size-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
