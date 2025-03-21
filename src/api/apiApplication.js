import supabaseClient, { supabaseUrl } from "@/utils/supabase";

// - Apply to job ( candidate )
export async function applyToJob(token, _, jobData) {
  const supabase = await supabaseClient(token);

  const random = Math.floor(Math.random() * 90000);
  const fileName = `resume-${random}-${jobData.candidate_id}`;

  console.log("Uploading file:", fileName);
  console.log("File details:", jobData.resume);

  // Ensure the file is a Blob or File object
  if (!(jobData.resume instanceof Blob || jobData.resume instanceof File)) {
    throw new Error("Invalid file format. File must be a Blob or File object.");
  }

  const { error: storageError } = await supabase.storage
    .from("resumes")
    .upload(fileName, jobData.resume, {
      cacheControl: "3600",
      upsert: false,
      contentType: jobData.resume.type, // Ensure correct MIME type
    });

  if (storageError) {
    console.error("Supabase Storage Error:", storageError);
    throw new Error("Error uploading Resume: " + storageError.message);
  }

  const resume = `${supabaseUrl}/storage/v1/object/public/resumes/${fileName}`;

  const { data, error } = await supabase
    .from("applications")
    .insert([
      {
        ...jobData,
        resume,
      },
    ])
    .select();

  if (error) {
    console.error(error);
    throw new Error("Error submitting Application");
  }

  return data;
}

// - Edit Application Status ( recruiter )
export async function updateApplicationStatus(token, { job_id }, status) {
  const supabase = await supabaseClient(token);
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("job_id", job_id)
    .select();

  if (error || data.length === 0) {
    console.error("Error Updating Application Status:", error);
    return null;
  }

  return data;
}

export async function getApplications(token, { user_id }) {
  const supabase = await supabaseClient(token);
  const { data, error } = await supabase
    .from("applications")
    .select("*, job:jobs(title, company:companies(name))")
    .eq("candidate_id", user_id);

  if (error) {
    console.error("Error fetching Applications:", error);
    return null;
  }

  return data;
}
