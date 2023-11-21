"use client"
// page.tsx
import { notFound } from "next/navigation";
import React, { useState, useEffect } from 'react';
import FormRenderer from './FormRenderer';
import { generateMetadata } from './metadata';

// Define the type for your JSON data
interface FormData {
  forms: FormObject[];
}

interface FormObject {
  name: string;
  description: string;
  questions: any[];
  tokens: Token[];
}

interface Token {
  [key: string]: {
    isUsed: boolean;
  };
}

// Define an interface for the params object
interface FormPageParams {
  params: {
    user: string;
    project: string;
    form: string;
    tokenId: string;
  }
}

// https://stackoverflow.com/questions/76650404/creating-dynamic-routes-from-local-json-file-nextjs-13
export default function FormPage({ params } : FormPageParams) {
  const [pageContent, setPageContent] = useState<JSX.Element | null>(null);

  const loadUserProjectData = async () => {
    try {
      // Dynamic import of the projects JSON file based on the project name
      const dataModule = await import(`@/app/database/${params.user}/projects.json`);
      // Change For Jest
      //const dataModule = await import(`../../../../database/${params.user}/projects.json`);
      return dataModule.default;
    } catch (error) {
      // Errors should, in theory, not be displayed to the user
      console.error("Error loading projects JSON data:", error);
      return null;
    }
  };

  const loadUserFormData = async () => {
    try {
      // Dynamic import of the forms JSON file based on the user and project names
      const dataModule = await import(`@/app/database/${params.user}/${params.project}/forms.json`);
      // Change For Jest
      //const dataModule = await import(`../../../../database/${params.user}/${params.project}/forms.json`); // For Jest
      return dataModule.default;
    } catch (error) {
      // Errors should, in theory, not be displayed to the user
      console.error("Error loading forms JSON data:", error);
      return null;
    }
  };

  useEffect(() => {
    const renderPage = async () => {
      try {
        const userProjectData = await loadUserProjectData();
        const userFormData = await loadUserFormData();

        if (!userProjectData || !userFormData) {
          notFound();
          return null;
        }

        // Assuming formList is an object of type FormData
        const formData: FormData = userFormData;

        // Find the form object with the specified key
        const formObject = formData.forms.find((form) => form.name === params.form);

        if (!formObject) {
          notFound();
          return null;
        }

        // Check if the specified "tokenId" exists in the formObject
        const tokenIdExists = formObject.tokens.find((token) => token[params.tokenId]);

        if (!tokenIdExists) {
          notFound();
          return null;
        }

        // Render the form's questions here
        return (
          <div>
            {formObject ? (
              <FormRenderer formObject={formObject} params={params} />
            ) : (
              <div>Loading...</div>
            )}
          </div>
        );
      } catch (error) {
        // Errors should, in theory, not be displayed to the user
        console.error('Error rendering page:', error);

        notFound();
        return null;
      }
    };

    renderPage().then((content) => {
      setPageContent(content);
    });
  }, [params]);

  // Call generateMetadata and set the title
  useEffect(() => {
    const setMetadata = async () => {
      const metadata = await generateMetadata({ params });
      document.title = metadata.title?.toString() || 'Project management survey tool (working title)';
    };

    setMetadata();
  }, [params]); // Run when params change

  return pageContent;
}