"use client";

import { useState, useEffect } from "react";
import { QuestionGenerationRequest, Question, QuestionGenerationResponse } from "@/types/question";
import { 
  STATE_OPTIONS, 
  GRADE_OPTIONS, 
  DIFFICULTY_OPTIONS, 
  getSubSkillsForGrade 
} from "@/lib/subskills";
import QuestionDisplay from "@/components/QuestionDisplay";

export default function Home() {
  const [formData, setFormData] = useState<QuestionGenerationRequest>({
    state: "CCSS",
    grade: "5",
    sub_skill: "",
    difficulty: "Medium",
    quantity: 3
  });

  const [subSkills, setSubSkills] = useState<Record<string, string[]>>({});
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Initialize sub-skills on mount
  useEffect(() => {
    const skills = getSubSkillsForGrade(formData.grade);
    setSubSkills(skills);
    if (Object.keys(skills).length > 0) {
      setSelectedDomain(Object.keys(skills)[0]);
    }
  }, []);

  // Update sub-skills when grade changes
  const handleGradeChange = (grade: string) => {
    const skills = getSubSkillsForGrade(grade);
    setSubSkills(skills);
    setSelectedDomain("");
    setFormData({ ...formData, grade, sub_skill: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sub_skill) {
      setError("Please select a sub-skill");
      return;
    }

    setLoading(true);
    setError("");
    setQuestions([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      const data: QuestionGenerationResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate questions");
      }

      setQuestions(data.questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const domains = Object.keys(subSkills);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Adaptive Mathematics Question Generator
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            US State Curriculum Alignment
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Question Parameters
              </h2>

              {/* State Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State Standards
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {STATE_OPTIONS.map((state) => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grade Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Grade Level
                </label>
                <select
                  value={formData.grade}
                  onChange={(e) => handleGradeChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {GRADE_OPTIONS.map((grade) => (
                    <option key={grade.value} value={grade.value}>
                      {grade.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Domain Selection */}
              {domains.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Domain
                  </label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => {
                      setSelectedDomain(e.target.value);
                      setFormData({ ...formData, sub_skill: "" });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select a domain</option>
                    {domains.map((domain) => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sub-skill Selection */}
              {selectedDomain && subSkills[selectedDomain] && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sub-skill
                  </label>
                  <select
                    value={formData.sub_skill}
                    onChange={(e) => setFormData({ ...formData, sub_skill: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a sub-skill</option>
                    {subSkills[selectedDomain].map((skill) => (
                      <option key={skill} value={skill}>
                        {skill}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Difficulty Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {DIFFICULTY_OPTIONS.map((diff) => (
                    <option key={diff.value} value={diff.value}>
                      {diff.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number of Questions
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !formData.sub_skill}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                {loading ? "Generating Questions..." : "Generate Questions"}
              </button>

              {!process.env.NEXT_PUBLIC_OPENAI_API_KEY && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> Set OPENAI_API_KEY environment variable to generate real questions. Currently showing mock data.
          </p>
        </div>
              )}
            </form>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-2">
            {questions.length > 0 ? (
              <QuestionDisplay questions={questions} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                <div className="text-gray-400 dark:text-gray-600 mb-4">
                  <svg
                    className="mx-auto h-24 w-24"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  No questions generated yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Fill out the form and click "Generate Questions" to create curriculum-aligned mathematics questions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
